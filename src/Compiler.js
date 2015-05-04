"use strict";

dopple.compiler = {};
dopple.compiler.cpp = 
{
	prepare: function() 
	{
		this.type = dopple.Type;
		this.flagType = dopple.Flag;
		this.varType = dopple.VarType;
		this.varTypeName = dopple.VarTypeName;

		this.scope = dopple.scope;

		this.lookup = [];
		this.lookup[this.type.NUMBER] = this.parseNumber;
		this.lookup[this.type.STRING] = this.parseString;
		this.lookup[this.type.BOOL] = this.parseBool;
		this.lookup[this.type.REFERENCE] = this.parseRef;
		this.lookup[this.type.NEW] = this.parseNew;
		this.lookup[this.type.BINARY] = this.parseBinary;
		this.lookup[this.type.IF] = this.parseIf;
		this.lookup[this.type.VAR] = this.parseVar;
		this.lookup[this.type.ASSIGN] = this.parseAssign;
		this.lookup[this.type.UNARY] = this.parseUnary;
		this.lookup[this.type.FUNCTION] = this.parseFunc;
		this.lookup[this.type.FUNCTION_CALL] = this.parseFuncCall;
		this.lookup[this.type.RETURN] = this.parseReturn;
		this.lookup[this.type.NULL] = this.parseNull;
	},

	compile: function()
	{
		var mainReturn = new dopple.AST.Return(new dopple.AST.Number(0));
		this.scope.body.push(mainReturn);

		var output = "";
		output += "#include \"dopple.h\"\n\n";

		var clsOutput = this.parseClasses(this.scope.classes);
		if(clsOutput) {
			output += clsOutput;
		}

		var varOutput = this.parseGlobalVars(this.scope.body);
		if(varOutput) {
			output += varOutput + "\n";
		}		

		var funcOutput = this.parseFuncs(this.scope.funcs);
		if(funcOutput) {
			output += funcOutput;
		}

		output += "int main(int argc, char *argv[]) \n{\n";

		output += this.parseScope(this.scope);

		output += "}\n";

		return output;
	},

	parseScope: function(scope)
	{
		var prevScope = this.scope;
		this.scope = scope;

		this.incTabs();

		var output = "";
		var nodeOutput = "";

		var node = null;
		var body = scope.body;
		var num = body.length;
		for(var n = 0; n < num; n++) 
		{
			node = body[n];
			if(!node || node.flags & this.flagType.HIDDEN) { continue; }

			nodeOutput = this.lookup[node.type].call(this, node);
			if(nodeOutput) 
			{
				if(node instanceof dopple.AST.If) {
					output += this.tabs + nodeOutput + "\n";
				}
				else {
					output += this.tabs + nodeOutput + ";\n";
				}
			}
		}
		
		this.decTabs();	

		this.scope = prevScope;

		return output;	
	},

	parseNumber: function(node) {
		return node.value;
	},

	parseString: function(node) 
	{
		var length = node.value.length;
		var hex = "\"\\x" + (length & 0x000000FF).toString(16);
		
		if(length > 255) {
			hex += "\\x" + (length & 0x0000FF00).toString(16);
			hex += "\\x" + (length & 0x00FF0000).toString(16);
			hex += "\\x" + (length & 0xFF000000).toString(16) + "\"";
		}
		else {
			hex += "\\x0\\x0\\x0\"";
		}
		return "(char *)" + hex + "\"" + node.value + "\"";
	},

	parseBool: function(node) 
	{
		if(node.value === 1) {
			return "true";
		}
		return "false";
	},

	parseRef: function(node) {
		return this.createName(node);
	},

	parseNew: function(node) 
	{
		if(node.value.type === this.type.VAR) {
			return "new " + node.cls.name + "()";
		}

		return "new " + node.name + "()";
	},	

	parseBinary: function(node) 
	{
		var output = 
			this.lookup[node.lhs.type].call(this, node.lhs) + 
			" " + node.op + " " +
			this.lookup[node.rhs.type].call(this, node.rhs);		

		return output;
	},

	parseIf: function(node)
	{
		var output = "if(" + this.lookup[node.value.type].call(this, node.value)+ ")\n";
		output += this.tabs + "{\n";
		output += this.parseScope(node.scope);
		output += this.tabs + "}";

		return output;
	},

	parseVar: function(node) 
	{
		var output = this.createType(node) + this.createName(node) + " = ";
		if(node.value) {
			output += this.lookup[node.value.type].call(this, node.value);
		}	
		else if(node.cls) {
			output += this.createDefaultValue(node.cls.name);
		}

		return output;
	},

	parseAssign: function(node)
	{
		var output = 
			this.createName(node) + " " + 
			node.op + " " + 
			this.lookup[node.value.type].call(this, node.value);

		return output;
	},

	parseUnary: function(node) {
		var output = node.op + this.lookup[node.value.type].call(this, node.value);
		return output;
	},

	parseFuncs: function(funcs) 
	{
		if(!funcs) { return ""; }

		var output = "";

		var func = null;
		var num = funcs.length;
		for(var n = 0; n < num; n++) 
		{
			func = funcs[n];
			if(func.flag & this.flagType.RESOLVED === 0) { continue; }

			output += this.parseFunc(func) + "\n";
		}

		return output;
	},	

	parseFunc: function(node)
	{
		var output = this.createType(node.value) + node.name;
		output += "(" + this.parseParams(node.params) + ")";
		output += "\n{\n" + this.parseScope(node.scope);
		output += "}\n";
		return output;
	},

	parseParams: function(params)
	{
		var output;
		var node = params[0];
		var num = params.length;

		if(num > 0)
		{
			output = this.createType(node) + node.name;

			for(var n = 1; n < num; n++) {
				node = params[n];
				output += ", " + this.createType(node) + node.name;
			}
		}
		else {
			output = "";
		}

		return output;
	},

	parseArgs: function(node)
	{
		var params = node.value.params;
		if(!params) { return ""; }

		var numParams = params.length

		var args = node.args;
		var node = args[0];
		var numArgs = args.length;

		var output = "";
		var n = 0;

		if(numArgs > 0)
		{
			output = this.lookup[node.type].call(this, node);

			for(n = 1; n < numArgs; n++) {
				node = args[n];
				output += ", " + this.lookup[node.type].call(this, node);
			}
		}

		if(numArgs < numParams)
		{
			if(n === 0) {
				output += this.createDefaultValue(params[n].type);
				n++;
			}

			for(; n < numParams; n++) {
				output += ", " + this.createDefaultValue(params[n].type);
			}
		}

		return output;
	},

	parseFuncCall: function(node) {
		var output = this.createName(node) + "(" + this.parseArgs(node) + ")";
		return output;
	},

	parseReturn: function(node)
	{
		var output = "return";

		if(node.value) {
			output += " " + this.lookup[node.value.type].call(this, node.value);
		}
		
		return output;
	},

	parseClasses: function(classes)
	{
		var output = "";

		var cls = null;
		var num = classes.length;
		for(var n = 0; n < num; n++) {
			output += this.parseClass(classes[n]) + "\n";
		}

		return output;
	},

	parseClass: function(node)
	{
		var output = null;

		if(node.global) {
			output = "struct {\n";
			output += this.parseScope(node.scope);
			output += "} " + node.name + ";\n";
		}
		else {
			output = "struct " + node.name + "{\n";
			output += this.parseScope(node.scope);
			output += "}\n";		
		}

		return output;
	},

	parseNull: function(node) {
		return "nullptr";
	},

	parseGlobalVars: function(body)
	{
		var output = "";

		var node = null;
		var num = body.length;
		for(var n = 0; n < num; n++) 
		{
			node = body[n];
			if(!node || node.type !== this.type.VAR || node.flags & this.flagType.EXTERN) { continue; }

			output += this.createType(node) + this.createName(node) + 
				" = " + this.createDefaultValue(node) + ";\n";
		}

		return output;
	},

	createType: function(node)
	{
		if(!node) {
			return "void ";
		}

		var name = "";

		if(!node || !node.cls) {
			name = "void";
		}
		else {
			name = node.cls.alt;
		}

		if(node.flags & this.flagType.PTR) {
			name += " *";
		}
		else {
			name += " ";
		}

		return name;
	},

	createDefaultValue: function(node) 
	{
		if(node.cls)
		{
			var type = node.cls.name;
			if(type === "Number") {
				return "0";
			}
			else if(type === "Boolean") {
				return "false";
			}
		}

		return "nullptr";
	},

	createName: function(node)
	{
		var name = "";
		var parents = node.parents;

		if(parents) 
		{
			var scope = this.scope;
			var parentNode = null;
			var parentName = null;
			var num = parents.length;
			for(var n = 0; n < num; n++) 
			{
				parentName = parents[n];

				for(;;)
				{
					parentNode = scope.vars[parentName];
					if(parentNode) { break; }

					scope = scope.parent;
					if(!scope) {
						throw "ReferenceError: " + paretName + " is not defined";
					}
				}
				
				name += parentName; 
				if(parentNode.global) {
					name += "."
				}
				else {
					name += "->";
				}

				scope = parentNode.scope;
			}
		}

		name += node.name;
		return name;
	},	

	incTabs: function() {
		this.tabs += "\t";
	},

	decTabs: function() {
		this.tabs = this.tabs.substr(0, this.tabs.length - 1);
	},	

	//
	scope: null,
	lookup: null,
	tabs: "",

	type: null,
	flagType: null
};