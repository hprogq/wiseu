export interface Identity {
	_id: string;
	type: string;
	alias: string;
	lastUpdated: string;
	typeInfo: IdentityType;
	info: Record<string, string>;
}

export interface IdentityType {
	type: string;
	name: string;
	description: string;
	icon: string;
}

export interface IdentityParam {
	fieldName: string;
	fieldType: string;
	displayName: string;
	required: boolean;
	description: string;
}
