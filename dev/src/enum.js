"use strict";

dopple.ExprType = {
	UNKNOWN: 0,
	NUMBER: 1,
	BOOL: 2,
	STRING: 3,
	BINARY: 4,
	ASSIGN: 5,
	UPDATE: 6,
	SUBSCRIPT: 7,
	LOGICAL: 8,
	UNARY: 9,
	VAR: 10,
	REFERENCE: 11,
	IF: 12,
	SWITCH: 13,
	SWITCH_CASE: 14,
	FOR: 15,
	FOR_IN: 16,
	WHILE: 17,
	DO_WHILE: 18,
	CONTINUE: 19,
	BREAK: 20,
	CONDITIONAL: 21,
	BLOCK: 22,
	RETURN: 23,
	FUNCTION: 24,
	FUNCTION_DEF: 25,
	FUNCTION_CALL: 26,
	SETTER: 27,
	GETTER: 28,
	SETTER_GETTER: 29,
	OBJECT: 30,
	OBJECT_PROPERTY: 31,
	CLASS: 32,
	MEMBER: 33,
	THIS: 34,
	NEW: 35,
	NULL: 36,
	ARRAY: 37,
	TYPE: 38
};

dopple.SubType = {
	UNKNOWN: 0,
	NUMBER: 1,
	BOOL: 2,
	STRING: 3,
	FUNCTION: 4,
	SETTER_GETTER: 5,
	OBJECT: 6,
	OBJECT_DEF: 7,
	CLASS: 8,
	ARRAY: 9
};

dopple.Flag = {
	UKNOWN: 1 << 0,
	ARGS: 1 << 1,
	VIRTUAL_TYPE: 1 << 2,
	INTERNAL_TYPE: 2 << 3
};
