"use strict";

dopple.compiler.js =
{
	compile: function(scope)
	{
		this.scope = scope;
		this.globalScope = scope;
		this.output = {};

		this.output = "\"use strict\"\n\n";
		this.output += this.parseBody(scope);

		return this.output;
	},

	parseScope: function(scope)
	{
		this.tabs += "\t";

		var output = this.parseBody(scope);

		this.tabs = this.tabs.substr(0, this.tabs.length - 1);

		return output;
	},

	parseBody: function(scope)
	{
		var output = "";
		var tmpOutput = "";

		// parse classes:
		var cls;
		var bodyCls = scope.bodyCls;
		var num = scope.bodyCls.length;
		for(var n = 0; n < num; n++)
		{
			cls = bodyCls[n];
			if(cls.flags & dopple.Flag.HIDDEN) { continue; }

			tmpOutput += this.parseCls(cls);
		}

		output += tmpOutput;
		tmpOutput = "";		

		// parse functions:
		var func;
		var bodyFuncs = scope.bodyFuncs;
		num = bodyFuncs.length;
		for(n = 0; n < num; n++)
		{
			func = bodyFuncs[n];
			if(func.flags & dopple.Flag.HIDDEN) { continue; }

			tmpOutput += this.parseFunc(func);
		}

		output += tmpOutput;
		tmpOutput = "";

		//
		var node;
		var body = scope.body;
		num = body.length;
		for(n = 0; n < num; n++)
		{
			node = body[n];
			if(!node) { continue; }
			if(node.flags & dopple.Flag.HIDDEN) { continue; }

			tmpOutput += this.tabs;

			switch(node.exprType)
			{
				case this.exprType.VAR:
					tmpOutput += this.parseVar(node) + ";";
					break;

				case this.exprType.ASSIGN:
					tmpOutput += this.parseAssign(node) + ";";
					break;

				case this.exprType.IF:
					tmpOutput += this.parseIf(node);
					break;		

				case this.exprType.FUNCTION_CALL:
					tmpOutput += this.parseFuncCall(node) + ";";
					break;

				case this.exprType.NEW: 
					tmpOutput += this.parseNew(node) + ";";
					break;

				case this.exprType.RETURN:
					tmpOutput += this.parseReturn(node) + ";";
					break;

				default:
					throw "unhandled";
			}

			tmpOutput += "\n";
		}

		output += tmpOutput;

		return output;
	},

	parseNumber: function(node) {
		return node.value;
	},

	parseBool: function(node) {
		return node.value ? "true" : "false";
	},

	parseString: function(node) {
		return "\"" + node.value + "\"";
	},

	parseId: function(node) {
		return node.value;
	},

	parseBinary: function(node) {
		return this.parseValue(node.lhs) + " " + node.op + " " + this.parseValue(node.rhs);
	},

	parseLogical: function(node) {
		return this.parseValue(node.lhs) + " " + node.op + " " + this.parseValue(node.rhs);
	},

	parseAssign: function(node)
	{
		var output = this.parseName(node.left) + " " + node.op + " " + this.parseValue(node.right);

		return output;
	},

	parseIf: function(node)
	{
		var output = "if" + this._parseBranch(node.branchIf);
		return output;
	},

	_parseBranch: function(branch)
	{
		var output = "(" + this.parseValue(branch.value) + ")\n";
		output += this.tabs + "{\n";
		output += this.parseScope(branch.scope);
		output += this.tabs + "}";

		return output;
	},

	parseNew: function(node) 
	{
		var output = "new " + this.parseName(node.name);

		if(node.args) {
			output += "(" + this.parseArgs(node.args) + ")";
		}

		return output;
	},

	parseNull: function(node)
	{
		return "null";
	},

	parseMember: function(node)
	{
		var output = this.parseName(node)
		return output;
	},

	parseObj: function(node)
	{
		var isEmpty = true;
		var vars = node.scope.vars;
		for(var key in vars) {
			isEmpty = false;
			break;
		}

		var output;
		if(!isEmpty) {
			output = "\n" + this.tabs + "{\n" + this.parseProto(vars) + "\n" + this.tabs + "}";
		}
		else {
			output = "{}";
		}
		
		return output;
	},

	parseArray: function(node)
	{
		var output = "[]";
		return output;
	},

	parseSetter: function(node)
	{
		var scopeOutput = this.parseScope(node.value.scope);

		var output = "(" + this.parseParams(node.value.params) + ")\n" + this.tabs + "{\n";
		
		if(scopeOutput) {
			output += scopeOutput;
		}

		output += this.tabs + "}";

		return output;
	},

	parseGetter: function(node)
	{
		var scopeOutput = this.parseScope(node.value.scope);

		var output = "()\n" + this.tabs + "{\n";
		
		if(scopeOutput) {
			output += scopeOutput;
		}

		output += this.tabs + "}";

		return output;
	},

	parseVar: function(node)
	{
		var ref = node.ref;

		var output = "var " + this.parseName(ref.name);
		output += " = " + this.parseValue(ref.value);

		return output;
	},

	parseRef: function(node)
	{
		var output = node.name;

		return output;
	},

	parseReturn: function(node)
	{
		var output = "return";
		if(node.value) {
			output += " " + this.parseValue(node.value);
		}

		return output;
	},	

	parseFunc: function(node)
	{
		var output = this.tabs + "function";

		if(node.name) {
			output += " " + node.name;
		}

		output += "(" + this.parseParams(node.params) + ")\n{\n";
		output += this.parseScope(node.scope);
		output += "}\n\n";

		return output;
	},

	parseFuncCall: function(node)
	{
		var output = this.parseName(node.name) + "(" + this.parseArgs(node.args) + ")";

		return output;
	},

	parseCls: function(node)
	{
		var output = this.parseFunc(node.constrFunc);
		output += node.name + ".prototype = \n{\n" + this.parseProto(node.scope.vars) + "\n};\n\n";

		return output;
	},

	parseProto: function(vars)
	{
		this.tabs += "\t";		

		var output = "";
		var added = false;

		var node;
		for(var key in vars)
		{
			if(added) {
				output += ",\n";
			}

			node = vars[key];
			if(node.exprType === this.exprType.SETTER_GETTER)
			{
				if(node.setter) {
					output += this.tabs + "set " + key + this.parseSetter(node.setter);
				}
				if(node.getter) 
				{
					if(node.setter) {
						output += ",\n";
					}
					output += this.tabs + "get " + key + this.parseGetter(node.getter);
				}
			}
			else {
				output += this.tabs + key + ": " + this.parseValue(node);
			}
			
			added = true;
		}

		this.tabs = this.tabs.substr(0, this.tabs.length - 1);

		return output;
	},

	parseName: function(node)
	{
		var output = "";

		if(node.exprType === this.exprType.IDENTIFIER) {
			output += node.value;
		}
		else if(node.exprType === this.exprType.MEMBER) {
			output += this.parseName(node.left) + "." + this.parseName(node.right);
		}
		else if(node.exprType === this.exprType.THIS) {
			output += "this";
		}
		else {
			throw "unhandled";
		}

		return output;
	},

	parseParams: function(buffer)
	{
		var output = "";

		var num = buffer.length;
		if(num > 0)
		{
			num--;
			
			for(var n = 0; n < num; n++) {
				output += this.parseValue(buffer[n]) + ", ";
			}
			output += this.parseValue(buffer[n]);			
		}

		return output;
	},

	parseArgs: function(buffer)
	{
		var output = "";

		var num = buffer.length;
		if(num > 0)
		{
			num--;

			for(var n = 0; n < num; n++) {
				output += this.parseValue(buffer[n]) + ", ";
			}
			output += this.parseValue(buffer[n]);			
		}

		return output;
	},

	parseValue: function(node)
	{
		switch(node.exprType)
		{
			case this.exprType.NUMBER:
				return this.parseNumber(node);

			case this.exprType.BOOL:
				return this.parseBool(node);				

			case this.exprType.STRING:
				return this.parseString(node);

			case this.exprType.IDENTIFIER:
				return this.parseId(node);

			case this.exprType.REFERENCE:
				return this.parseRef(node);

			case this.exprType.MEMBER:
				return this.parseMember(node);

			case this.exprType.BINARY:
				return this.parseBinary(node);

			case this.exprType.LOGICAL:
				return this.parseLogical(node);

			case this.exprType.ASSIGN:
				return this.parseAssign(node);

			case this.exprType.NEW:
				return this.parseNew(node);	

			case this.exprType.NULL:
				return this.parseNull(node);

			case this.exprType.OBJECT:
				return this.parseObj(node);

			case this.exprType.ARRAY:
				return this.parseArray(node);

			default:
				throw "unhandled";
		}
	},

	//
	scope: null,
	globalScope: null,
	output: null,

	tabs: "",

	types: dopple.types,
	subType: dopple.SubType,
	exprType: dopple.ExprType	
};