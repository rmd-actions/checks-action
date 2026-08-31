/** biome-ignore-all lint/style/useNamingConvention: GH Names */
import { info } from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
import type * as GH from "./namespaces/GitHub.ts";
import type { Args } from "./namespaces/inputs.ts";
import { Conclusion, Status } from "./namespaces/inputs.ts";

type Ownership = {
	owner: string;
	repo: string;
};

const unpackInputs = (title: string, inputs: Args): GH.Inputs => {
	let output: GH.Inputs["output"];
	if (inputs.output) {
		output = {
			annotations: inputs.annotations,
			images: inputs.images,
			summary: inputs.output.summary,
			text: inputs.output.text_description,
			title: inputs.output.title ?? title,
		};
	}

	let detailsUrl: string | undefined;

	if (inputs.conclusion === Conclusion.ActionRequired || inputs.actions) {
		if (inputs.detailsURL) {
			const reasonList: string[] = [];
			if (inputs.conclusion === Conclusion.ActionRequired) {
				reasonList.push(`'conclusion' is 'action_required'`);
			}
			if (inputs.actions) {
				reasonList.push(`'actions' was provided`);
			}
			const reasons = reasonList.join(" and ");
			info(
				`'details_url' was ignored in favor of 'action_url' because ${reasons} (see documentation for details)`,
			);
		}
		detailsUrl = inputs.actionURL;
	} else if (inputs.detailsURL) {
		detailsUrl = inputs.detailsURL;
	}

	return {
		actions: inputs.actions,
		completed_at: inputs.status === Status.Completed ? formatDate() : undefined,
		conclusion: inputs.conclusion
			? (inputs.conclusion.toString() as GH.Inputs["conclusion"])
			: undefined,
		details_url: detailsUrl,
		output,
		status: inputs.status.toString() as GH.Inputs["status"],
	};
};

const formatDate = (): string => new Date().toISOString();

export const createRun = async (
	octokit: InstanceType<typeof GitHub>,
	name: string,
	sha: string,
	ownership: Ownership,
	inputs: Args,
): Promise<number> => {
	const { data } = await octokit.rest.checks.create({
		...ownership,
		head_sha: sha,
		name,
		started_at: formatDate(),
		...unpackInputs(name, inputs),
	});
	return data.id;
};

export const updateRun = async (
	octokit: InstanceType<typeof GitHub>,
	id: number,
	ownership: Ownership,
	inputs: Args,
): Promise<void> => {
	const previous = await octokit.rest.checks.get({
		...ownership,
		check_run_id: id,
	});
	await octokit.rest.checks.update({
		...ownership,
		check_run_id: id,
		...unpackInputs(previous.data.name, inputs),
	});
};
