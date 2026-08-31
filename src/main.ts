import { debug, getInput, setFailed, setOutput } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { createRun, updateRun } from "./checks.ts";
import { parseInputs } from "./inputs.ts";
import { localFetcher, useLocalFetcher } from "./mocks.ts";
import type * as GitHub from "./namespaces/GitHub.ts";
import type * as Inputs from "./namespaces/inputs.ts";

const isCreation = (inputs: Inputs.Args): inputs is Inputs.ArgsCreate =>
	Boolean((inputs as Inputs.ArgsCreate).name);

const prEvents = [
	"pull_request",
	"pull_request_review",
	"pull_request_review_comment",
	"pull_request_target",
];

const options: GitHub.OctokitOptions = useLocalFetcher
	? {
			request: {
				fetch: localFetcher,
			},
		}
	: {};

const getSHA = (inputSHA: string | undefined): string => {
	let sha = context.sha;
	if (prEvents.includes(context.eventName)) {
		const pull = context.payload.pull_request as GitHub.PullRequest | undefined;
		if (pull?.head.sha) {
			sha = pull?.head.sha;
		}
	}
	if (inputSHA) {
		sha = inputSHA;
	}
	return sha;
};

const run = async (): Promise<void> => {
	try {
		debug("Parsing inputs");
		const inputs = parseInputs(getInput);

		debug("Setting up OctoKit");
		const octokit = getOctokit(inputs.token, {
			...options,
			baseUrl: inputs.githubAPIURL ?? options.baseUrl,
		});

		const ownership = {
			owner: context.repo.owner,
			repo: context.repo.repo,
		};
		const sha = getSHA(inputs.sha);

		if (inputs.repo) {
			const [owner, repoName] = inputs.repo.split("/") as [string, string];
			ownership.owner = owner;
			ownership.repo = repoName;
		}

		if (isCreation(inputs)) {
			debug(
				`Creating a new Run on ${ownership.owner}/${ownership.repo}@${sha}`,
			);
			const id = await createRun(octokit, inputs.name, sha, ownership, inputs);
			setOutput("check_id", id);
		} else {
			const id = inputs.checkID;
			debug(
				`Updating a Run on ${ownership.owner}/${ownership.repo}@${sha} (${id})`,
			);
			await updateRun(octokit, id, ownership, inputs);
		}
		debug("Done");
	} catch (e) {
		const error = e as Error;
		debug(error.toString());
		setFailed(error.message);
	}
};

run();
