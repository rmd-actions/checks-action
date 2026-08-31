import fs from "node:fs";
import type { InputOptions } from "@actions/core";
import type * as GitHub from "./namespaces/GitHub.ts";
import type { Args, Output } from "./namespaces/inputs.ts";
import { Conclusion, Status } from "./namespaces/inputs.ts";

type GetInput = (name: string, options?: InputOptions | undefined) => string;

const parseJSON = <T>(getInput: GetInput, property: string): T | undefined => {
	const value = getInput(property);
	if (!value) {
		return;
	}
	try {
		return JSON.parse(value) as T;
	} catch (e) {
		throw new Error(
			`invalid format for '${property}': ${(e as Error).toString()}`,
			{
				cause: e,
			},
		);
	}
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: inputs validation is inherently a long checklist
export const parseInputs = (getInput: GetInput): Args => {
	const githubAPIURL = getInput("github_api_url");
	const repo = getInput("repo");
	const sha = getInput("sha");
	const token = getInput("token", { required: true });
	const outputTextDescriptionFile = getInput("output_text_description_file");

	const name = getInput("name");
	const checkIDStr = getInput("check_id");

	const status = getInput("status", { required: true }) as Status;
	let conclusion = getInput("conclusion") as Conclusion;

	const actionURL = getInput("action_url");
	const detailsURL = getInput("details_url");

	if (repo && repo.split("/").length !== 2) {
		throw new Error("repo needs to be in the {owner}/{repository} format");
	}

	if (name && checkIDStr) {
		throw new Error(`can only provide 'name' or 'check_id'`);
	}

	if (!(name || checkIDStr)) {
		throw new Error(`must provide 'name' or 'check_id'`);
	}

	const checkID = checkIDStr ? Number.parseInt(checkIDStr, 10) : undefined;

	if (!Object.values(Status).includes(status)) {
		throw new Error(`invalid value for 'status': '${status}'`);
	}

	if (conclusion) {
		conclusion = conclusion.toLowerCase() as Conclusion;
		if (!Object.values(Conclusion).includes(conclusion)) {
			if (conclusion.toString() === "stale") {
				throw new Error(
					`'stale' is a conclusion reserved for GitHub and cannot be set manually`,
				);
			}
			throw new Error(`invalid value for 'conclusion': '${conclusion}'`);
		}
	}

	if (status === Status.Completed) {
		if (!conclusion) {
			throw new Error(`'conclusion' is required when 'status' is 'completed'`);
		}
	} else if (conclusion) {
		throw new Error(
			`can't provide a 'conclusion' with a non-'completed' 'status'`,
		);
	}

	const output = parseJSON<Output>(getInput, "output");
	const annotations = parseJSON<GitHub.Annotations>(getInput, "annotations");
	const images = parseJSON<GitHub.Images>(getInput, "images");
	const actions = parseJSON<GitHub.Actions>(getInput, "actions");

	if (!actionURL && (conclusion === Conclusion.ActionRequired || actions)) {
		throw new Error(`missing value for 'action_url'`);
	}

	if (output && outputTextDescriptionFile) {
		output.text_description = fs.readFileSync(
			outputTextDescriptionFile,
			"utf8",
		);
	}

	if (!output?.summary && (annotations || images)) {
		throw new Error(`missing value for 'output.summary'`);
	}

	return {
		actions,

		actionURL,
		annotations,

		checkID,
		conclusion,
		detailsURL,
		githubAPIURL,
		images,
		name,

		output,
		repo,
		sha,
		status,
		token,
	};
};
