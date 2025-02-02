/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { synthSnapshot } from "./utils";
import { CdktfProviderProject, CdktfProviderProjectOptions } from "../src";

const getProject = (
  opts: Partial<CdktfProviderProjectOptions> = {}
): CdktfProviderProject =>
  new CdktfProviderProject({
    name: "test",
    terraformProvider: "random@~>2.0",
    author: "cdktf-team",
    authorAddress: "https://github.com/cdktf",
    cdktfVersion: "0.10.3",
    constructsVersion: "10.0.0",
    defaultReleaseBranch: "main",
    repositoryUrl: "github.com/cdktf/cdktf",
    forceMajorVersion: 42,
    devDeps: ["@cdktf/provider-project@^0.0.0"],
    ...opts,
  });

test("synths with minimal options", () => {
  const snapshot = synthSnapshot(getProject());

  expect(snapshot).toMatchSnapshot();
});

test("build runs without telemetry", () => {
  const snapshot = synthSnapshot(getProject());

  expect(JSON.parse(snapshot[".projen/tasks.json"])).toHaveProperty(
    "env.CHECKPOINT_DISABLE",
    "1"
  );
});

test("build runs without crash reporting", () => {
  const snapshot = synthSnapshot(getProject());

  expect(JSON.parse(snapshot["cdktf.json"])).toHaveProperty(
    "sendCrashReports",
    false
  );
});

test("synths with custom Github runners", () => {
  const snapshot = synthSnapshot(getProject({ useCustomGithubRunner: true }));

  expect(snapshot).toMatchSnapshot();
});

test("synths with an advanced version range syntax", () => {
  const snapshot = synthSnapshot(
    getProject({ cdktfVersion: ">=0.12.2 <0.14.0" })
  );

  expect(snapshot).toMatchSnapshot();
});

test("sets minMajorVersion to 1 by default so that breaking changes increast the major version", () => {
  const snapshot = synthSnapshot(getProject());

  expect(JSON.parse(snapshot[".projen/tasks.json"])).toHaveProperty(
    "tasks.release.env.MIN_MAJOR",
    "1"
  );
});

test("sets resolution for yargs", () => {
  const snapshot = synthSnapshot(getProject());

  const packageJson = JSON.parse(snapshot["package.json"]);
  expect(packageJson).toHaveProperty("resolutions");
  expect(packageJson.resolutions).toHaveProperty("@types/yargs");
  expect(packageJson.resolutions["@types/yargs"]).toEqual("17.0.13");
});

test("README contains provided Namespace", () => {
  const snapshotWithVersion = synthSnapshot(
    getProject({ terraformProvider: "random@~> 3.1" })
  );

  const snapshotWithoutVersion = synthSnapshot(
    getProject({ terraformProvider: "random" })
  );

  expect(snapshotWithVersion["README.md"]).toEqual(
    expect.stringContaining(
      "- [Terraform random provider](https://registry.terraform.io/providers/hashicorp/random/3.1.0)"
    )
  );

  expect(snapshotWithoutVersion["README.md"]).toEqual(
    expect.stringContaining(
      "- [Terraform random provider](https://registry.terraform.io/providers/hashicorp/random/)"
    )
  );
});

test("golang release workflow has copyright headers", () => {
  const snapshot = synthSnapshot(getProject());
  const release = snapshot[".github/workflows/release.yml"];
  const releaseLines = release.split("\n");
  const releaseGoLineIndex = releaseLines.findIndex((line: string) =>
    line.includes("release_go")
  );

  expect(releaseGoLineIndex).toBeGreaterThan(0);

  expect(releaseLines.slice(releaseGoLineIndex + 1).join("\n")).toEqual(
    expect.stringContaining("hashicorp/setup-copywrite")
  );
});

test("has a custom workflow and README if the project is deprecated", () => {
  const snapshot = synthSnapshot(
    getProject({ isDeprecated: true, deprecationDate: "December 11, 2023" })
  );

  expect(snapshot).toMatchSnapshot();

  expect(JSON.parse(snapshot["package.json"])).toHaveProperty(
    "cdktf.isDeprecated",
    true
  );

  expect(snapshot["README.md"]).toEqual(
    expect.stringContaining(
      "HashiCorp made the decision to stop publishing new versions of"
    )
  );

  const release = snapshot[".github/workflows/release.yml"];
  expect(release).toEqual(
    expect.stringContaining(
      "Deprecate the package in package managers if needed"
    )
  );

  const releaseLines = release.split("\n");
  const releaseGoLineIndex = releaseLines.findIndex((line: string) =>
    line.includes("release_go")
  );
  expect(releaseLines.slice(releaseGoLineIndex + 1).join("\n")).toEqual(
    expect.stringContaining(
      "// Deprecated: HashiCorp is no longer publishing new versions of the prebuilt provider for random."
    )
  );
});
