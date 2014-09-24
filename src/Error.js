"use strict";

dopple =
{
	Error: {
		REFERENCE_ERROR: 1,
		UNEXPECTED_EOI: 2,
		INVALID_REGEXP: 10,
		INVALID_TYPE_CONVERSION: 1000,
		TOO_MANY_ARGUMENTS: 1001
	},

	throw: function(type, arg)
	{
		if(type === this.Type.REFERENCE_ERROR) {
			throw "ReferenceError: " + arg + " is not defined";
		}
		else if(type === this.Type.UNEXPECTED_EOI) {
			throw "SyntaxError: Unexpected end of input";
		}
		else if(type === this.Type.INVALID_REGEXP) {
			throw "SyntaxError: Invalid regular expression: missing " + arg;
		}	
		else if(type === this.Type.INVALID_TYPE_CONVERSION) {
			throw "Invalid Type Conversion: " + arg;
		}
		else if(type === this.Type.TOO_MANY_ARGUMENTS) {
			throw "Too many arguments passed.";
		}

		throw "Unknown";
	}
};