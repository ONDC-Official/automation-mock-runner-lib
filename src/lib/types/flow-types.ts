// Define your data types
export interface FetchFlowsResponse {
	domain: Domain[];
}

export interface Domain {
	name: string;
	flows: Flow[];
}

export interface Flow {
	id: string;
	title?: string;
	description?: string;
	sequence: SequenceStep[];
}

export interface SequenceStep {
	key: string;
	type: string;
	unsolicited: boolean;
	description?: string;
	pair: string | null;
	owner: "BAP" | "BPP";
	stackable?: boolean;
	input?: any;
	expect?: boolean;
	label?: string;
	force_proceed?: boolean;
	repeat?: number;
}
