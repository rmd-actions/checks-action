/** biome-ignore-all lint/style/useNamingConvention: GH Names */
import type { Actions, Annotations, Images } from "./GitHub.ts";

type ArgsBase = {
	actions?: Actions;

	actionURL?: string;
	annotations?: Annotations;
	conclusion?: Conclusion;
	detailsURL?: string;
	githubAPIURL?: string;
	images?: Images;

	output?: Output;
	repo?: string;
	sha?: string;
	status: Status;
	token: string;
};

export type ArgsCreate = ArgsBase & {
	name: string;
};

export type ArgsUpdate = ArgsBase & {
	checkID: number;
};

export type Args = ArgsCreate | ArgsUpdate;

export type Output = {
	summary: string;
	text_description?: string;
	title?: string;
};

export enum Conclusion {
	Success = "success",
	Failure = "failure",
	Neutral = "neutral",
	Cancelled = "cancelled",
	TimedOut = "timed_out",
	ActionRequired = "action_required",
	Skipped = "skipped",
}

export enum Status {
	Queued = "queued",
	InProgress = "in_progress",
	Completed = "completed",
}
