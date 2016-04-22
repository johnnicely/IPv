/**
 * 
 * The software below is based on Beau Gunderson's IPv4 / IPv6 library,
 * originally available at:
 * 
 * https://github.com/beaugunderson/javascript-ipv6
 * 
 * In accordance with the license provided with his software, this library is also
 * licensed under the same terms (MIT License). The license is provided in the LICENSE
 * file included with this repository.
 *
 **/

// 0 => full match
// 1 => full IPv4 address
// 2 => subnet mask length, if present
RE_VALID_IPV4 = /^((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))(?:\/(3[0-2]|[1-2]?[0-9]))?$/;

// 0 => full match
// 1 => full IPv6 address
// 2 => IPv4-in-IPv6 match, if present
// 3 => subnet mask length, if present
// 4 => zone, if present
RE_VALID_IPV6 = /^((?:(?=(?:.*?::.*?|(?:[^:]*?:){7}))(?!(?:[^:]+:){8,})(?:(?:::ffff:((?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)))|(?:(?:::(?!.*::))?(?:[0-9a-f]{1,4}(?:(?:::(?!.*::))|:(?=[0-9a-f])|:(?!(?:$|\/))|$|(?=(?:\/|%)))){0,8}))))(?:\/(1[0-1][0-9]|12[0-8]|[0-9]{1,2}))?(?:%(.*))?$/i;

/**
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * Also licensed under MIT License.
 **/
(function()
{
	var initializing = false,
		fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
	
	// The base Class implementation (does nothing)
	this.Class = function(){};
	
	// Create a new Class that inherits from this class
	Class.extend = function(prop)
	{
		var _super = this.prototype;
		
		// Instantiate a base class (but only create the instance,
		// don't run the init constructor)
		initializing = true;
		var prototype = new this();
		initializing = false;
		
		// Copy the properties over onto the new prototype
		for (var name in prop)
		{
			// Check if we're overwriting an existing function
			if (typeof(prop[name]) == 'function' && typeof(_super[name]) == 'function' && fnTest.test(prop[name]))
			{
				prototype[name] = (function(name, fn)
				{
					return function()
					{
						var tmp = this._super;
						
						// Add a new ._super() method that is the same method
						// but on the super-class
						this._super = _super[name];
						
						// The method only need to be bound temporarily, so we
						// remove it when we're done executing
						var ret = fn.apply(this, arguments);
						this._super = tmp;
						
						return ret;
					};
				})(name, prop[name]);
			}
			else
			{
				prototype[name] = prop[name];
			}
		}
		
		// The dummy class constructor
		function Class()
		{
			// All construction is actually done in the init method
			if (!initializing && this.init)
			{
				this.init.apply(this, arguments);
			}
		}
		
		// Populate our constructed prototype object
		Class.prototype = prototype;
		
		// Enforce the constructor to be what we expect
		Class.prototype.constructor = Class;
		
		// And make this class extendable
		Class.extend = arguments.callee;
		
		return Class;
	};
})();

var IPv = Class.extend({
	'init': function(address)
	{
		this.valid = false;
		this.original = address;
		this.address = null;
		this.parsed_address = null;
		
		this.parse();
	},
	'parse': function()
	{
		this.valid = true;
		
		var address_components = this.re_valid_ip.exec(this.original);
		this.address = address_components[1];
		
		if (this.version === 4)
		{
			if (address_components[2] !== undefined)
			{
				this.subnet = parseInt(address_components[2], 10);
			}
		}
		else if (this.version === 6)
		{
			if (address_components[3] !== undefined)
			{
				this.subnet = parseInt(address_components[3], 10);
			}
		}
		
		if (this.subnet < 0 || this.subnet > this.bit_size)
		{
			this.valid = false;
			throw 'Invalid subnet mask.';
		}
		
		if (this.version === 6)
		{
			if (address_components[4] !== undefined)
			{
				this.zone = address_components[4];
			}
			
			if (address_components[2] !== undefined)
			{
				this.v4inv6 = true;
				
				var address_replacement = IPv.create(address_components[2]);
				this.address = this.address.replace(address_components[2], address_replacement.to_hex());
			}
		}
		
		this.parsed_address = this.address.split(this.delimiter);
		return this.parsed_address;
	},
	'is_valid': function()
	{
		return this.valid;
	},
	'mask': function(subnet)
	{
		if (subnet === undefined)
		{
			var subnet = this.subnet;
		}
		
		return this.bits().slice(0, subnet);
	},
	'zero_pad': function(string, number)
	{
		var padded = '',
			i = 0;
		
		while (i++ < number)
		{
			padded += '0';
		}
		
		return (padded + string).slice(-1 * number);
	},
	'bits': function(base, start, end)
	{
		if (base === undefined)
		{
			var base = 2;
		}
		
		var result = [];
		
		if (base === 2)
		{
			for (var group in this.parsed_address)
			{
				if (this.version === 6)
				{
					result.push(this.zero_pad(parseInt(this.parsed_address[group], 16).toString(2), 16));
				}
				else
				{
					result.push(this.zero_pad(parseInt(this.parsed_address[group], 10).toString(2), 8));
				}
			}
			
			result = result.join('');
			
			if (start !== undefined && end !== undefined)
			{
				result = result.slice(start, end);
			}
			else if (start !== undefined)
			{
				result = result.slice(start);
			}
			else if (end !== undefined)
			{
				result = result.slice(0, end);
			}
		}
		else if (base === 16)
		{
			length = start - end;
			result = this.zero_pad(parseInt(this.bits(2, start, end), 2).toString(16), length / 4);
		}
		
		return result;
	},
	'is_in_subnet': function(address)
	{
		if (!(address instanceof IPv) || !(this.version == address.version))
		{
			return false;
		}
		
		if (this.mask().indexOf(address.mask()) == 0)
		{
			return true;
		}
		
		return false;
	},
	'original_form': function()
	{
		return this.original;
	}
});

IPv.create = function(address)
{
	if (RE_VALID_IPV4.test(address))
	{
		return new IPv4(address);
	}
	else if (RE_VALID_IPV6.test(address))
	{
		return new IPv6(address);
	}
	else
	{
		throw 'Not a valid IP address: ' + address;
	}
};

var IPv4 = IPv.extend({
	're_valid_ip': RE_VALID_IPV4,
	'version': 4,
	'bit_size': 32,
	'groups': 4,
	'delimiter': '.',
	'subnet': 32,
	'from_hex': function(hex)
	{
		var padded = ('00000000' + hex.replace(/:/g, '')).slice(-8),
			groups = [];
		
		for (var i = 0; i < 8; i += 2)
		{
			h = padded.slice(i, i + 2);
			groups.push(parseInt(h, 16));
		}
		
		return IPv.create(groups.join('.'));
	},
	'to_hex': function()
	{
		var output = [];
		var i;
		
		for (i = 0; i < this.groups; i += 2)
		{
			var hex = sprintf('%02x%02x', parseInt(this.parsed_address[i], 10), parseInt(this.parsed_address[i + 1], 10));
			
			output.push(sprintf('%x', parseInt(hex, 16)));
		}
		
		return output.join(':');
	},
	'is_loopback': function()
	{
		return this.is_in_subnet(IPv.create('127.0.0.0/8'));
	},
	'correct_form': function()
	{
		if (!this.valid)
		{
			return null;
		}
		
		return this.parsed_address.join('.');
	},
	'canonical_form': function()
	{
		return this.correct_form();
	},
	'reverse_form': function()
	{
		if (!this.valid)
		{
			return null;
		}
		
		return sprintf('%s.in-addr.arpa', this.parsed_address.reverse().join('.'));
	}
});

var IPv6 = IPv.extend({
	're_valid_ip': RE_VALID_IPV6,
	're_bad_address': /([0-9a-f]{5,}|:{3,}|[^:]:$|^:[^:]|\/$)/i,
	'version': 6,
	'bit_size': 128,
	'groups': 8,
	'delimiter': ':',
	'scopes': {
		0: 'Reserved',
		1: 'Interface local',
		2: 'Link local',
		4: 'Admin local',
		5: 'Site local',
		8: 'Organization local',
		15: 'Global',
		16: 'Reserved'
	},
	'subnet': 128,
	'zone': '',
	'v4inv6': false,
	'parse': function()
	{
		// Not sure whether this call should be _super.parse() or just _super?
		this._super();
		
		if (this.re_bad_address.test(this.address))
		{
			this.valid = false;
			throw 'Invalid IPv6 address: ' + this.address;
		}
		
		groups = [];
		halves = this.address.split('::');
		
		if (halves.length == 2)
		{
			first = halves[0].split(':');
			last = halves[1].split(':');
			
			if (first.length == 1 && first[0] == '')
			{
				first = [];
			}
			
			if (last.length == 1 && last[0] == '')
			{
				last = [];
			}
			
			remaining = this.groups - (first.length + last.length);
			
			if (!remaining)
			{
				this.valid = false;
				throw 'Error parsing IPv6 groups';
			}
			
			this.elidedGroups = remaining;
			
			this.elisionBegin = first.length;
			this.elisionEnd = first.length + this.elidedGroups;
			
			for (var i = 0; i < first.length; i++)
			{
				groups.push(first[i]);
			}
			
			for (var i = 0; i < remaining; i++)
			{
				groups.push(0);
			}
			
			for (var i = 0; i < last.length; i++)
			{
				groups.push(last[i]);
			}
		}
		else if (halves.length == 1)
		{
			groups = this.address.split(':');
			this.elidedGroups = 0;
		}
		else
		{
			this.valid = false;
			throw 'Too many :: groups found';
		}
		
		for (var key in groups)
		{
			groups[key] = sprintf('%x', parseInt(groups[key], 16));
			
			if (groups[key].length > 4)
			{
				this.valid = false;
				throw 'Group ' + key + ' is too long';
			}
		}
		
		this.parsed_address = groups;
		return this.parsed_address;
	},
	'is_loopback': function()
	{
		return this.get_type() === 'Loopback';
	},
	'is_multicast': function()
	{
		return this.get_type() === 'Multicast';
	},
	'is_link_local': function()
	{
		return this.bits(2, 0, 64) === '1111111010000000000000000000000000000000000000000000000000000000';
	},
	'is_canonical': function()
	{
		return this.address === this.canonical_form();
	},
	'is_correct': function()
	{
		return this.address === this.correct_form();
	},
	'is_teredo': function()
	{
		return this.is_in_subnet(IPv.create('2001::/32'));
	},
	'is_6to4': function()
	{
		return this.is_in_subnet(IPv.create('2002::/16'));
	},
	'get_type': function()
	{
		// TODO: Refactor this
		// TODO: Add ff0x::fb, etc. for multicast DNS
		var types = {
			'ff01::1/128': 'Multicast (All nodes on this interface)',
			'ff01::2/128': 'Multicast (All routers on this interface)',
			'ff02::1/128': 'Multicast (All nodes on this link)',
			'ff02::2/128': 'Multicast (All routers on this link)',
			'ff05::2/128': 'Multicast (All routers in this site)',
			'ff02::5/128': 'Multicast (OSPFv3 AllSPF routers)',
			'ff02::6/128': 'Multicast (OSPFv3 AllDR routers)',
			'ff02::9/128': 'Multicast (RIP routers)',
			'ff02::a/128': 'Multicast (EIGRP routers)',
			'ff02::d/128': 'Multicast (PIM routers)',
			'ff02::16/128': 'Multicast (MLDv2 reports)',
			'ff01::fb/128': 'Multicast (mDNSv6)',
			'ff02::fb/128': 'Multicast (mDNSv6)',
			'ff05::fb/128': 'Multicast (mDNSv6)',
			'ff02::1:2/128': 'Multicast (All DHCP servers and relay agents on this link)',
			'ff05::1:2/128': 'Multicast (All DHCP servers and relay agents in this site)',
			'ff02::1:3/128': 'Multicast (All DHCP servers on this link)',
			'ff05::1:3/128': 'Multicast (All DHCP servers in this site)',
			'::/128': 'Unspecified',
			'::1/128': 'Loopback',
			'ff00::/8': 'Multicast',
			'fe80::/10': 'Link-local unicast'
		};
		
		var the_type = 'Global unicast';
		
		for (var p in types)
		{
			if (types.hasOwnProperty(p) && this.is_in_subnet(IPv.create(p)))
			{
				the_type = types[p];
				break;
			}
		}
		
		return type;
	},
	'compact': function(address, slice_point)
	{
		var s1 = [],
			s2 = [];
		
		for (var i = 0; i < address.length; i++)
		{
			if (i < slice_point[0])
			{
				s1.push(address[i]);
			}
			else if (i > slice_point[1])
			{
				s2.push(address[i]);
			}
		}
		
		s1.push('compact');
		return s1.concat(s2);
	},
	'microsoft_transcription': function()
	{
		return sprintf('%s.ipv6-literal.net', this.correct_form().replace(/:/g, '-'));
	},
	'correct_form': function()
	{
		var groups = [];
		
		var zero_counter = 0;
		var zeroes = [];
		
		for (var i = 0; i < this.parsed_address.length; i++)
		{
			var value = parseInt(this.parsed_address[i], 16);
			
			if (value === 0)
			{
				zero_counter++;
			}
			
			if (zero_counter > 0 && value !== 0)
			{
				if (zero_counter > 1)
				{
					zeroes.push([i - zero_counter, i - 1]);
				}
				
				zero_counter = 0;
			}
		}
		
		// Do we end with a string of zeroes?
		if (zero_counter > 1)
		{
			zeroes.push([this.parsed_address.length - zero_counter, this.parsed_address.length - 1]);
		}
		
		var zero_lengths = [];
		
		for (var zero in zeroes)
		{
			zero_lengths.push((zeroes[zero][1] - zeroes[zero][0]) + 1);
		}
		
		if (zeroes.length > 0)
		{
			var maxval = Math.max.apply(Math, zero_lengths);
			var index = zero_lengths.indexOf(maxval);
			
			groups = this.compact(this.parsed_address, zeroes[index]);
		}
		else
		{
			groups = this.parsed_address;
		}
		
		for (var i = 0; i < groups.length; i++)
		{
			if (groups[i] !== 'compact')
			{
				groups[i] = parseInt(groups[i], 16).toString(16);
			}
		}
		
		var correct = groups.join(':');
		
		correct = correct.replace(/^compact$/, '::');
		correct = correct.replace(/^compact|compact$/, ':');
		correct = correct.replace(/compact/, '');
		
		return correct;
	},
	'canonical_form': function()
	{
		if (!this.valid)
		{
			return;
		}
		
		var result = [];
		for (var group in this.parsed_address)
		{
			result.push(sprintf('%04x', parseInt(this.parsed_address[group], 16)));
		}
		
		return result.join(':');
	},
	'reverse_form': function()
	{
		var characters = Math.floor(this.subnet / 4);
		var reversed = this.canonical_form()
			.replace(/:/g, '')
			.split('')
			.slice(0, characters)
			.reverse()
			.join('.');
			
		if (characters > 0)
		{
			return sprintf('%s.ip6.arpa', reversed);
		}
		else
		{
			return 'ip6.arpa';
		}
	},
	'from_ipv4': function(address)
	{
		return IPv.create('::ffff:' + address);
	},
	'get_scope': function()
	{
		var scope_index = parseInt(this.bits(2, 12, 16), 2)
		var scope = typeof(this.scopes[scope_index]) !== 'undefined' ? this.scopes[scope_index] : null;
		
		if (this.get_type() === 'Global unicast')
		{
			if (scope !== 'Link local')
			{
				scope = 'Global';
			}
		}
		
		return scope;
	}
});


