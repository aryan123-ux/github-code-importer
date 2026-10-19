import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SyncStatus = {
  repo: string;
  url: string;
  branch: string;
  commit: { sha: string; message: string; author: string; date: string; url: string };
};

// Reads public repo metadata from GitHub. Optional GITHUB_TOKEN secret enables private repos.
export const getGithubSyncStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        repo: z
          .string()
          .trim()
          .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use the format owner/repository"),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<SyncStatus> => {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "api-sentinel",
    };
    const token = process.env["GITHUB_TOKEN"];
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const repoRes = await fetch(`https://api.github.com/repos/${data.repo}`, { headers });
    if (repoRes.status === 404) {
      throw new Error(
        token
          ? "Repository not found, or the saved GitHub token can't access it. Grant it access to this repo."
          : "Repository not found. If it's private, add a GitHub token to enable private access.",
      );
    }
    if (repoRes.status === 401) {
      throw new Error("The saved GitHub token is invalid or expired. Replace it with a new one.");
    }
    if (!repoRes.ok) throw new Error(`GitHub returned ${repoRes.status}: ${await repoRes.text()}`);
    const repo = (await repoRes.json()) as { full_name: string; html_url: string; default_branch: string };

    const cRes = await fetch(
      `https://api.github.com/repos/${data.repo}/commits/${encodeURIComponent(repo.default_branch)}`,
      { headers },
    );
    if (!cRes.ok) throw new Error(`GitHub returned ${cRes.status}: ${await cRes.text()}`);
    const c = (await cRes.json()) as {
      sha: string;
      html_url: string;
      commit: { message: string; author: { name: string; date: string } };
    };

    return {
      repo: repo.full_name,
      url: repo.html_url,
      branch: repo.default_branch,
      commit: {
        sha: c.sha,
        message: c.commit.message.split("\n")[0] ?? "",
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url,
      },
    };
  });
