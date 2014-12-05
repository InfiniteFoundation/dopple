"use strict";

dopple.TokenEnum = {
	EOF: 0,
	SYMBOL: 1,
	BINOP: 2,
	NUMBER: 3,
	BOOL: 4,
	NAME: 5,
	STRING: 6,
	VAR: 7,
	FUNCTION: 8,
	RETURN: 9,
	IF: 10,
	FOR: 11,
	WHILE: 12,
	DO: 13,
	COMMENT: 14,
};

dopple.ExprEnum = {
	VOID: 0,
	VAR: 1,
	NUMBER: 2,
	BOOL: 3,
	NAME: 4,
	STRING: 5,
	BINOP: 6,
	BINARY: 7,
	FUNCTION: 8,
	FUNCTION_CALL: 9,
	FUNCTION_PTR: 10,
	RETURN: 11,
	PROTOTYPE: 12,
	CLASS: 13,
	FORMAT: 14,
	IF: 15
};

dopple.VarEnum = {
	VOID: 0,
	NUMBER: 1,
	STRING: 2,
	BOOL: 3,
	FUNCTION: 4,
	FUNCTION_PTR: 5,
	CLASS: 6,
	NAME: 10,
	FORMAT: 11
};