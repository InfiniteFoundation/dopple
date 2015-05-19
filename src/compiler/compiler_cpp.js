"use strict";

dopple.compiler.cpp = 
{
	prepare: function() 
	{
		this.ast = dopple.AST;
		this.type = dopple.Type;
		this.flagType = dopple.Flag;
		this.nativeVars = dopple.nativeVars;

		this.scope = dopple.scope;
		this.global = this.scope;

		this.lookup = [];
		this.lookup[this.type.REAL32] = this.outputReal32;
		this.lookup[this.type.NUMBER] = this.outputReal64;
		this.lookup[this.type.STRING] = this.parseString;
		this.lookup[this.type.BOOL] = this.parseBool;
		this.lookup[this.type.REFERENCE] = this.parseRef;
		this.lookup[this.type.NEW] = this.parseNew;
		this.lookup[this.type.BINARY] = this.parseBinary;
		this.lookup[this.type.IF] = this.parseIf;
		this.lookup[this.type.CONDITIONAL] = this.parseConditional;
		this.lookup[this.type.VAR] = this.parseVar;
		this.lookup[this.type.ASSIGN] = this.parseAssign;
		this.lookup[this.type.UNARY] = this.parseUnary;
		this.lookup[this.type.FUNCTION] = this.parseFunc;
		this.lookup[this.type.FUNCTION_CALL] = this.parseFuncCall;
		this.lookup[this.type.FUNCTION_DEF] = this.outputFuncDef;
		this.lookup[this.type.RETURN] = this.parseReturn;
		this.lookup[this.type.NULL] = this.parseNull;
		this.lookup[this.type.ARRAY] = this.parseArray;

		this.argLookup = [];
		this.argLookup[this.type.NUMBER] = this.outputArgNumber;
		this.argLookup[this.type.STRING] = this.outputArgString;
		this.argLookup[this.type.BOOL] = this.outputArgBool;
		this.argLookup[this.type.REFERENCE] = this.outputArgRef;
		this.argLookup[this.type.FUNCTION_CALL] = this.outputArgFuncCall;

		this.argFormatByType = [];
		this.argFormatByType[this.type.NUMBER] = "%g.17";
		this.argFormatByType[this.type.STRING] = "%s";
	},

	compile: function()
	{
		var mainReturn = new dopple.AST.Return(new dopple.AST.Number(0));
		this.scope.body.push(mainReturn);

		var output = "#include \"dopple.h\"\n\n";

		var clsOutput = this.parseClasses(this.scope.classes);
		if(clsOutput) {
			output += clsOutput + "\n";
		}

		var scopeOutput = "int main(int argc, char **argv) \n{\n";
		scopeOutput += this.parseScope(this.scope);
		scopeOutput += "}\n";

		// Write global scope declarations:
		var cache = this.scope.cache;
		if(cache.declOutput) {
			output += cache.declOutput + "\n";
			cache.declOutput = "";
		}

		var funcOutput = this.parseFuncs(this.scope.funcs);
		if(funcOutput) {
			output += funcOutput;
		}

		output += scopeOutput;

		return output;
	},

	parseScope: function(scope)
	{
		var prevScope = this.scope;
		this.scope = scope;

		this.incTabs();

		if(!this.scope.virtual)	{
			this.parseScopeDecls();			
		}

		// Output the rest of the scope:
		var output = "";
		var nodeOutput = "";
		var cache = this.scope.cache;		
		var node = null;
		var body = scope.body;
		var num = body.length;
		for(var n = 0; n < num; n++) 
		{
			node = body[n];
			if(!node || node.flags & this.flagType.HIDDEN) { continue; }

			nodeOutput = this.lookup[node.type].call(this, node, 0);

			if(cache.preOutput) {
				output += cache.preOutput;
				cache.preOutput = "";
			}
			if(nodeOutput) 
			{
				output += this.tabs + nodeOutput;
				if(node.type === this.type.IF) {
					output += "\n";
				}
				else {
					output += ";\n";
				}
			}
		}	

		if(!this.scope.virtual && this.scope !== this.global)
		{
			var cache = this.scope.cache;
			if(cache.declOutput) 
			{
				if(output) {
					output = cache.declOutput + "\n" + output;
				}
				else {
					output = cache.declOutput;
				}

				cache.declOutput = "";
			}
		}

		this.decTabs();	

		this.scope = prevScope;

		return output;	
	},

	parseScopeDecls: function()
	{
		var cache = this.scope.cache;
		var decls = cache.decls;
		if(!decls) { return; }

		var declGroups = cache.declGroups;
		if(!declGroups) {
			declGroups = {};
			cache.declGroups = declGroups;
		}

		var strType = "";
		var typeBuffer = null;		

		// Group declerations in hashmap:
		var node = null;
		var num = decls.length;
		for(var n = 0; n < num; n++) 
		{
			node = decls[n];

			strType = this.createType(node);
			typeBuffer = declGroups[strType];
			if(!typeBuffer) {
				typeBuffer = [ node ];
				declGroups[strType] = typeBuffer;
			}
			else {
				typeBuffer.push(node);
			}
		}

		this.outputScopeDecls();				
	},

	outputScopeDecls: function()
	{
		// Output group by group all declerations:
		var tabs = this.tabs;
		if(this.scope === this.global) {
			tabs = "";
		}

		var n, num, node, typeBuffer;
		var cache = this.scope.cache;
		var declGroups = cache.declGroups;

		for(var key in declGroups)
		{
			typeBuffer = declGroups[key];
			cache.declOutput += tabs + key;
			num = typeBuffer.length - 1;
			for(n = 0; n < num; n++) 
			{
				node = typeBuffer[n];
				this._outputScopeNode(node);

				if(node.flags & this.flagType.PTR) { 
					cache.declOutput += ", *";
				}	
				else {
					cache.declOutput += ", ";
				}		
			}

			this._outputScopeNode(typeBuffer[n]);
			cache.declOutput += ";\n";
		}		
	},

	_outputScopeNode: function(node) 
	{
		if(node.flags & this.flagType.MEMORY_STACK) {
			this.scope.cache.declOutput += this.createName(node);
		}	
		else if(node.value && node.value.flags & this.flagType.KNOWN) 
		{
			this.scope.cache.declOutput += this.createName(node) + " = " + 
				this.lookup[node.value.type].call(this, node.value);

			node.flags |= this.flagType.HIDDEN;
		}	
		else 
		{
			this.scope.cache.declOutput += 
				this.createName(node) + " = " + this.createDefaultValue(node);
		}
	},

	outputReal32: function(node, flags) 
	{
		if(node.value === Math.round(node.value)) {
			return node.value + ".0f";
		}

		return node.value + "f";
	},

	outputReal64: function(node, flags) {
		return node.value + "";
	},	

	parseString: function(node, flags) 
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

	parseBool: function(node, flags) {
		return node.value + "";
	},

	parseRef: function(node, flags) 
	{
		if(node.value && node.value.flags & this.flagType.GETTER) {
			return this.createGetterName(node);
		}

		return this.createName(node);
	},

	parseNew: function(node, parent, flags) 
	{
		if(!node.args) {
			return "";
		}

		var output;

		if(node.flags & this.flagType.MEMORY_STACK) 
		{
			if(node.args.length === 0) {
				output = "";
			}
			else 
			{
				if(node instanceof dopple.AST.Var) {
					output = node.cls.name + "(" + this.parseArgs(node) + ")";
				}
				else {
					output = node.name + "(" + this.parseArgs(node) + ")";
				}				
			}

			if(flags & this.Flag.PARSING_ARGS) {
				var name = this.scope.genVar(node.cls);
				this.scope.cache.preOutput += this.tabs + this.createType(node) + name + " = " + output + ";\n";
				return name;
			}
		}
		else 
		{
			if(node instanceof dopple.AST.Var) {
				output = "new " + node.cls.name + "(" + this.parseArgs(node) + ")";
			}
			else {
				output = "new " + node.name + "(" + this.parseArgs(node) + ")";
			}
		}

		return output;
	},	

	parseBinary: function(node, flags) 
	{
		var output = 
			this.lookup[node.lhs.type].call(this, node.lhs, flags) + 
			" " + node.op + " " +
			this.lookup[node.rhs.type].call(this, node.rhs, flags);		

		return output;
	},

	parseIf: function(node)
	{
		var branch = node.branchIf;
		var output = "if(" + this.lookup[branch.value.type].call(this, branch.value, null)+ ")\n";
		output += this.tabs + "{\n";
		output += this.parseScope(branch.scope);
		output += this.tabs + "}";

		if(node.branchElseIf)
		{
			var branches = node.branchElseIf;
			var num = branches.length;
			for(var n = 0; n < num; n++) {
				branch = branches[n];
				output += "\n" + this.tabs + "else if(" + 
					this.lookup[branch.value.type].call(this, branch.value, null)+ ")\n";
				output += this.tabs + "{\n";
				output += this.parseScope(branch.scope);
				output += this.tabs + "}";				
			}
		}

		if(node.branchElse) {
			output += "\n" + this.tabs + "else\n";
			output += this.tabs + "{\n";
			output += this.parseScope(branch.scope);
			output += this.tabs + "}";				
		}

		return output;
	},

	parseConditional: function(node, flags)
	{
		var output = "(" + this.lookup[node.test.type].call(this, node.test, flags) + " ? ";
		output += this.lookup[node.value.type].call(this, node.value, flags) + " : ";
		output += this.lookup[node.valueFail.type].call(this, node.valueFail, flags) + ")";

		return output;
	},

	parseVar: function(node, flags) 
	{
		var output = "";

		if(node.value) 
		{
			var valueOutput = this.lookup[node.value.type].call(this, node.value, flags);
			if(valueOutput) {
				output = this.createName(node, flags) + " = " + valueOutput;
			}
		}

		return output;
	},

	parseAssign: function(node, flags) 
	{
		var output;

		if(node.flags & this.flagType.SETTER) 
		{
			output = this.createSetterName(node) + "(" 
				+ this.lookup[node.value.type].call(this, node.value, flags) + ")";
		}
		else 
		{
			if(node.value) 
			{
				var valueOutput = this.lookup[node.value.type].call(this, node.value, flags);
				if(valueOutput) {
					output = this.createName(node) + " " + node.op + " " + valueOutput;
				}
			}
		}

		return output;
	},

	parseUnary: function(node, flags) {
		var output = node.op + this.lookup[node.value.type].call(this, node.value, flags);
		return output;
	},

	parseArray: function(node, parent, flags) 
	{
		var genVarName = "";

		var elements = node.elements;
		var num = 0;
		if(elements)
		{
			var elementOutput = "";
			var elementNode = null;
			var num = elements.length;
			var iterNum = num - 1;

			var castingPrefix = "";
			if(node.templateValue.cls.clsType !== parent.templateValue.cls.clsType) {
				castingPrefix = parent.templateValue.cls.alt + "(";
			}

			for(var n = 0; n < iterNum; n++) {
				elementNode = elements[n];
				elementOutput += castingPrefix + this.lookup[elementNode.type].call(this, elementNode, flags) + "), ";
			}
			elementNode = elements[n];
			elementOutput += castingPrefix + this.lookup[elementNode.type].call(this, elementNode, flags) + ")";

			genVarName = this.scope.genVar(parent.templateValue.cls);

			var templateTypeName = this.createTemplateType(parent);
			var preOutput = this.tabs + templateTypeName;
			if(templateTypeName[templateTypeName.length - 1] !== "*") {
				preOutput += " ";
			}
			preOutput += genVarName + "[" + num + "] = { " + elementOutput;
			preOutput += " };\n";
			this.scope.cache.preOutput += preOutput;
		}
		else {
			return "";
		}

		var output;

		if(flags & this.Flag.PARSING_ARGS) {
			output = genVarName + ", " + num;
		}
		else {
			output = "Array<" + this.createTemplateType(node) + ">(" + genVarName + ")";
		}
		
		return output;
	},

	parseFuncs: function(funcs, flags) 
	{
		if(!funcs) { return ""; }

		var output = "";

		var func = null;
		var num = funcs.length;
		for(var n = 0; n < num; n++) 
		{
			func = funcs[n];
			if((func.flags & this.flagType.RESOLVED) === 0) { continue; }

			output += this.parseFunc(func) + "\n";
		}

		return output;
	},	

	parseFunc: function(node)
	{
		var scopeOutput = this.parseScope(node.scope);

		var output = this.createType(node.value) + node.name;
		output += "(" + this.parseParams(node.params) + ") \n{\n";
		
		if(this.declOutput) {
			output += this.declOutput + "\n";
		}
		
		output += scopeOutput;
		output += "}\n";

		return output;
	},

	parseParams: function(params, flags)
	{
		var output;
		var node = params[0];
		var num = params.length;

		if(num > 0)
		{
			output = this.createType(node, true) + node.name;

			for(var n = 1; n < num; n++) {
				node = params[n];
				output += ", " + this.createType(node, true) + node.name;
			}
		}
		else {
			output = "";
		}

		return output;
	},

	parseArgs: function(node, flags)
	{
		var params = node.func.params;
		if(!params) { return ""; }

		var flags = this.Flag.PARSING_ARGS;
		var numParams = params.length

		var param, arg;
		var args = node.args;
		var numArgs = args.length;

		var output = "";
		var n = 0;

		if(numArgs > 0)
		{
			arg = args[0];
			param = params[0];

			var argsIndex = node.func.argsIndex;
			if(argsIndex > -1)
			{
				if(param.cls === this.nativeVars.Args) {
					output = this.createStrArgs(args, 0);
				}				
			}
			else 
			{
				output = this.lookup[arg.type].call(this, arg, param, flags);

				for(n = 1; n < numArgs; n++) {
					arg = args[n];
					output += ", " + this.lookup[arg.type].call(this, arg, param, flags);
				}				
			}
		}

		if(numArgs < numParams)
		{
			if(n === 0) {
				output += this.createDefaultValue(params[n]);
				n++;
			}

			for(; n < numParams; n++) {
				output += ", " + this.createDefaultValue(params[n]);
			}
		}

		return output;
	},

	parseFuncCall: function(node, parent, flags) {
		var output = this.createName(node) + "(" + this.parseArgs(node, parent, flags) + ")";
		return output;
	},

	outputFuncDef: function(node) {
		var output = node.name;
		return output;
	},

	parseReturn: function(node, flags)
	{
		var output = "return";

		if(node.value) {
			output += " " + this.lookup[node.value.type].call(this, node.value, flags);
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

	parseNull: function(node, flags) {
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

	createType: function(node, param)
	{
		if(!node) {
			return "void ";
		}

		if(!node.cls || node.cls.clsType === this.type.NULL) {
			return "void *";
		}

		var name = node.cls.alt;

		if(node.cls.flags & this.flagType.TEMPLATE) {
			name += "<" + this.createTemplateType(node) + ">";
		}			

		if(node.flags & this.flagType.PTR)
		{
			if(node.flags & this.flagType.MEMORY_STACK)	{
				name += " ";
			}
			else {
				name += " *";
			}
		}
		else {
			name += " ";
		}

		return name;
	},

	createTemplateType: function(node)
	{
		if(!node || !node.templateValue) {
			return "void *";
		}

		var name = node.templateValue.cls.alt;		

		if(node.templateValue.flags & this.flagType.PTR) {
			name += " *";
		}

		if(node.templateValue.templateValue) {
			name += "<" + this.createTemplateType(node.templateValue) + ">";
		}

		return name;
	},	

	createDefaultValue: function(node) 
	{
		if(node.cls)
		{
			var type = node.cls.clsType;
			switch(type)
			{
				case this.type.NUMBER: return "0";
				case this.type.BOOL: return "false";
				case this.type.ARGS: return "\"\"";
				case this.type.REAL32: return "0.0f";
			}
		}

		return "nullptr";
	},

	createNamePath: function(node)
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
				if(parentNode.flags & this.flagType.MEMORY_STACK || parentNode.global) {
					name += "."
				}
				else {
					name += "->";
				}

				scope = parentNode.scope;
			}
		}

		return name;		
	},

	createName: function(node) {
		return this.createNamePath(node) + node.name;
	},	

	createSetterName: function(node) {
		return this.createNamePath(node) + "__setter__" + node.name;
	},

	createGetterName: function(node) {
		return this.createNamePath(node) + "__getter__" + node.name + "()";
	},

	createStrArgs: function(args, index) 
	{
		var cache = new this.ArgCache();
		var numArgs = args.length;

		var arg = args[0];
		this.argLookup[arg.type].call(this, arg, cache, 0);

		for(var n = 1; n < numArgs; n++) {
			arg = args[n];
			this.argLookup[arg.type].call(this, arg, cache, n);
		}

		var output = "\"" + cache.format.slice(1) + "\\n\"" + cache.args;

		return output;
	},

	outputArgNumber: function(node, cache, index) 
	{
		if(index === 0) {
			cache.format += "%.17g";	
		}
		else {
			cache.format += " %.17g";		
		}

		if(node.value === Math.floor(node.value)) {
			cache.args += ", " + node.value + ".0";
		}
		else {
			cache.args += ", " + node.value;
		}
	},

	outputArgString: function(node, cache, index) {
		cache.format += " " + node.value;
	},

	outputArgBool: function(node, cache, index) 
	{
		cache.format += " %s";		

		if(node.value === 1) {
			cache.args += ", \"true\"";
		}
		else {
			cache.args += ", \"false\"";
		}
	},

	outputArgRef: function(node, cache, index) 
	{
		var varType = node.cls.varType;
		if(varType === this.type.NUMBER) {
			cache.args += ", " + this.parseRef(node);
			cache.format += " %.17g";
		}
		else if(varType === this.type.STRING) {
			cache.args += ", " + this.parseRef(node) + " + dopple::STR_HEADER_SIZE";
			cache.format += " %s";			
		}
	},

	outputArgFuncCall: function(node, cache, index)
	{
		var varType = node.cls.varType;
		if(varType === this.type.NUMBER) {
			cache.args += ", " + this.parseFuncCall(node);
			cache.format += " %.17g";
		}
		else if(varType === this.type.STRING) {
			cache.args += ", " + this.parseFuncCall(node) + " + dopple::STR_HEADER_SIZE";
			cache.format += " %s";			
		}
	},

	incTabs: function() {
		this.tabs += "\t";
	},

	decTabs: function() {
		this.tabs = this.tabs.substr(0, this.tabs.length - 1);
	},	

	ArgCache: function() {
		this.format = "";
		this.args = "";
	},

	Flag: {
		PARSING_ARGS: 1
	},

	//
	scope: null,
	global: null,

	lookup: null,
	argLookup: null,
	tabs: "",

	ast: null,
	type: null,
	flagType: null,

	nativeVars: null
};
