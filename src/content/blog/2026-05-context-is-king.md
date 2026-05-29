---
title: "Context Is King: Human Language in Code Matters More Than Ever"
description: "Code is the what; comments, commit messages, and PR descriptions are the why. Why the LLM era makes writing down context non-negotiable."
date: 2026-05-28
tags: [essays, engineering, llms, documentation]
draft: false
---

> **TLDR:** Code is the *what*. Comments, commit messages, PR descriptions, and Slack threads are the *why*. The self-documenting code era stripped the *why* out of codebases. LLMs make the cost urgent. Models can't infer what isn't in the text, and comments are inline instructions for them. Write context where a reader, human or model, would reasonably try the wrong thing or learn something from reading it that would not be very easily recoverable from reading code alone. Keep durable reasoning inline. Put perishable claims (rollout state, "this PR", dates) in commits and PRs. Treat comments as first-class citizens: they have owners, audiences, and failure modes. Update them in the same commit as the code they describe. Review them like code — a stale comment that ships is a bug that ships. Deletions of context are logical changes that need their own PR and commit message, not collateral lumped into a "chore" diff. Commit messages answer problem, cause, fix, verification. PR descriptions survive separation from the video call or conversation that produced them. Code is becoming commodity output. Curating the context that lets the next reader, human or model, do the right thing is the job of an experienced engineer. Learn the skill of skimming comments, only reading them when you're focusing on the context being commented.

There are three distinct parts of any single file in a codebase:

1. The code that a parser reads with a lexer.
2. Comments within that file, both attached to specific blocks (e.g., a single statement or function) or at the top of the file outlining the purpose in general.
3. And, temporally, commit messages associating a group of changes within one or more files into a single atomic change.

Outside of this, there are also PR summaries for documenting a single logical changeset into the codebase, and other documentation such as READMEs, and more recently `AGENTS.md`, etc.

We have spent decades arguing about how much of each to write. Regardless of historical arguments, the arrival of capable LLMs settles the argument.

Write more. And, here is why:

## The "comments are dead weight" era was wrong

For most of the past two decades, there was a camp that insisted that comments were a smell. Good code did not need them. The naming was the documentation. The structure was the documentation. Tests were the documentation. Comments rotted, lied, and added noise, so the discipline of writing clear code was supposed to replace the discipline of writing about it.

This view always had a kernel of truth. Bad comments do indeed rot. Restating code in English is absolutely a waste of bytes and cognitive load. But sadly, I often saw this doctrine being over-applied.

"Do not write comments that duplicate the code" somehow became "do not write comments."

Entire codebases shipped with nothing but type signatures and tests as documentation. The result was for sure not cleaner code. The result was code that could be read but not understood. You could trace what every line did and still have no idea why any of it existed.

The problem is not just acute in imperative code. It is arguably even more important in declarative configuration. Terraform, Helm, IAM policies, etc: these formats describe state, not just behavior. There is no control flow that explains itself. The file says what should exist; nothing in the file says why.

A `lifecycle { prevent_destroy = true }` block on an RDS instance tells you the state. It does not tell you that someone destroyed the production database in 2022 and the company lost three days of revenue. A security group with port 8443 open to a `/8` tells you the rule. It does not tell you the rule exists because a specific partner integration cannot use TLS 1.3 and must terminate through a legacy proxy. A `for_each` over four AWS regions tells you the regions. It does not tell you the other six were excluded because of data residency requirements in three of them and latency budgets in the other three. An IAM policy with a narrow `Resource` ARN tells you the scope. It does not tell you the broader version was the cause of a 2023 cross-account incident.

Declarative config without comments is the purest expression of the failure mode. Every line is a decision. Every decision has context. Strip the context and you have an exhibit you can look at, but you can't question it, and changing it feels dangerous because you don't know why it is the way it is.

This will often manifest within an organization as people feeling like they don't have ownership or ability to make changes. Or having specific people who need to not only be a reviewer of a change, but are the only ones who really understand it.

So nobody else changes things. It calcifies. New requirements get layered on top of old ones nobody understands. Refactoring becomes scarier. The system gets harder to operate every year.

The "minimal comments" school was indeed a reaction to a real problem — noisy and decaying comments — that overshot into a worse problem: code and config without intent.

The correction is overdue, and the LLM era makes it urgent. A model reading your Terraform has even less ability to infer intent than a model reading your application code, because there is no logic for it to follow. Just state, all the way down. If you have not written the why, the why does not exist.

## What this looks like in practice

Here is a real example from a recent Terraform change. Strip the comments and the diff looks like ordinary infrastructure config: a couple of variable assignments, a Cloud Run service definition, a few flags. With the comments, the diff is a postmortem of a debugging session, a constraint document, and a forward instruction to future maintainers, all delivered at the point of impact.

The first block:

```hcl
# Built by hand rather than read from the module output, to break a cycle:
# this value is consumed by `core_env`/`edge_env`, both of which flow into
# the same `module.cloud_run_services` map where geoip is defined. Reading
# `module.cloud_run_services["geoip"].service_uri` here would require the
# module to be fully evaluated before its own inputs are known. Cloud Run's
# project-number URL form is stable and deterministic, so we can reconstruct
# it without going through the module.
cloud_run_geoip_uri = "dns:geoip-${data.google_project.this.number}.${local.region}.run.app:443"
```

Without that comment, the first engineer or AI agent to refactor this file does the obvious thing: replaces the constructed URL with `module.cloud_run_services["geoip"].service_uri`. Cleaner, less stringly-typed, fewer interpolations. Terraform then refuses to plan because of a dependency cycle, and the engineer spends an hour rediscovering what the original author already knew. The comment is a fence around a tempting bad change.

The second block:

```hcl
# Scheme is `dns:` (not `https://`) and the port is explicit. This URL is
# read by the Go service's gRPC client (pkg/geoip) and passed straight into
# `grpc.NewClient`. gRPC-Go's resolver accepts a small fixed set of schemes
# (dns, passthrough, unix). `https://…` parses without error but the name
# resolver returns zero addresses, so every Lookup fails with Unavailable.
```

This is the single most LLM-relevant kind of comment. A model staring at this string in isolation has every incentive to "fix" it. `https://` looks correct. `dns:` looks like a typo. The Terraform file gives no hint that this string is consumed by a gRPC client in a different language in a different repository. Without the comment, the model confidently breaks production with a one-line cleanup. With the comment, the model has the cross-repository context the diff alone could never carry.

The third block:

```hcl
# `?insecure=true` flips the pkg/geoip client into h2c (no TLS) mode.
# Traffic stays inside the VPC for the entire path, so this is contained.
# Adding TLS would mean a Cert Manager regional cert or a self-signed cert
# with corresponding client trust-store changes; that is on the followup
# list, not in this PR. The LB-to-Cloud-Run hop is independently TLS-
# terminated by Google's serverless infra in either case.
```

This block does three jobs at once. It explains what the flag does, defends the security posture (someone will eventually — or at least should — ask "why are we running insecure?"), and flags the deferred work without burying it in a ticket. The next person to touch this file does not need to read three Slack threads and a design doc. The decision and its expiration date are right here.

The fourth, on the ingress setting:

```hcl
# Reachable only through the Internal Application LB defined in
# geoip_internal_lb.tf (private DNS `geoip.internal.staging.example.dev`).
# We tried INTERNAL_ONLY first and it did not work: edge-api/core-api use
# `PRIVATE_RANGES_ONLY` egress, which routes `.run.app` traffic out the
# public path, where Cloud Run's frontend treats the request as external
# and returns 404 under INTERNAL_ONLY. Going through an LB with a real
# RFC1918 address forces the request through the VPC, which is what the
# INTERNAL_LOAD_BALANCER ingress check is looking for.
ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
```

This is pure debugging archaeology. It captures the failed approach (`INTERNAL_ONLY`), the reason it failed (egress routing interacts with Cloud Run's ingress classifier), and the working alternative, all inline at the line that does the work. Three months from now, when someone wonders whether they can simplify by going back to `INTERNAL_ONLY`, the answer is right there. No git archaeology, no Slack search, no asking the on-call.

The pattern across all four: the comments are not describing what the code does. They are describing what the code does *not* do, why obvious alternatives were rejected, and where the implicit cross-system dependencies live. They are the negative space. They are the fence posts that stop the next change, by human or model, from walking into the same traps that produced the current code.

## Different comment locations do different work

The four blocks above all do the same job: they fence off tempting wrong changes. That is one mode. There are others.

### Rollout context

A diff says what changed in the config. It does not always say what changes about production behavior, or how to back the change out. Here is a comment I wrote on a recent PR enabling local-MMDB IP lookups in prod for the first time:

```hcl
# Local-MMDB geoip lookups (platform-go #421 + #423). Setting
# GEOIP_MMDB_DIR=/data tells pkg/geoip to mmap the dataset files baked
# into the edge-api and core-api container images at
# /data/something.mmdb. Lookups then resolve from in-process
# mmap at microsecond scale, with no network hop.
#
# NOTE: GEOIP_URI has never been set in production, so today the noop
# client is active and the transformer falls back to CF headers when
# populating user_activity geo. This PR turns geoip lookups on in
# prod for the first time. user_activity rows will start to carry
# geoip-derived city/country instead of CF-derived values. Same shape
# as the staging rollout (#117/#118/#119/#121), except prod goes
# 0 → local-MMDB in a single step rather than the 0 → remote-gRPC →
# local-MMDB path staging took.
#
# Scoped to something-01 (eu-central1) as the canary. something-00 follows in
# a separate PR. The eu-south1 something-01 variants stay on the CF-header
# path for now (no geoip service deployed in us-south1). To revert:
# drop GEOIP_MMDB_DIR and the noop client takes over again on the
# next revision rollout.
core_cell_01_env = merge(local.common_vars, local.api_common_vars, local.core_vars, local.core_cell_01_vars, { GEOIP_MMDB_DIR = "/data" })
```

I wrote this and it was wrong to put all of it in the file. The first paragraph is fine. It explains what `GEOIP_MMDB_DIR` does: `pkg/geoip` mmaps the dataset baked into the image, lookups resolve in-process, no network hop. That is steady-state. It is true the day the PR lands and it is true a year later. It is comment material.

The rest is not. "`GEOIP_URI` has never been set in production" is a claim about the state of the world the day I wrote it. "This PR turns geoip lookups on in prod for the first time" is a claim about a specific change at a specific moment. "Scoped to something-01 as the canary, something-00 follows in a separate PR" is a rollout plan with a half-life measured in weeks.

Every one of those sentences starts decaying the moment it is committed. Six months later, when something-00 has been rolled out and the canary is forgotten and `GEOIP_URI` may or may not exist anywhere in the system, a comment in the production Terraform is asserting a no-longer-true picture of reality to every reader who shows up after me. The same trap as a stale comment that drifted under changing code, except worse, because no surrounding code has to change for the comment to go wrong. Time alone is enough.

The rule that should have caught it: if a comment contains "today", "for the first time", "this PR", "currently", or any other timestamp implicit or explicit, it does not belong in the inline comment. It belongs in the commit message and the PR description. Those artifacts are timestamped by construction. A commit from March is not expected to describe the system in November. A comment in a file is. Mixing the two contracts in one block of text means the durable half drags the perishable half forward into a future where it is no longer true.

What I should have written in the file:

```hcl
# Enables local-MMDB geoip lookups. GEOIP_MMDB_DIR=/data tells
# pkg/geoip to mmap the dataset files baked into the edge-api and
# core-api container images at /data/something.mmdb. Lookups
# resolve from in-process mmap at microsecond scale, no network hop.
# See pkg/geoip (platform-go #421) for the client behavior; the
# noop client takes over if GEOIP_MMDB_DIR is unset.
core_cell_01_env = merge(local.common_vars, local.api_common_vars, local.core_vars, local.core_cell_01_vars, { GEOIP_MMDB_DIR = "/data" })
```

And what should have been the commit message body, with the same content the comment was trying to carry, but in the artifact that knows what date it was written on:

```text
Enable local-MMDB geoip lookups on core-api something-01 (eu-central1).

GEOIP_URI has never been set in prod, so the noop client has been
active and the transformer has been falling back to CF headers
when populating user_activity geo. This commit turns geoip lookups
on in prod for the first time. user_activity rows will start to
carry geoip-derived city/country instead of CF-derived values.

Same shape as the staging rollout (#117/#118/#119/#121), except
prod goes 0 → local-MMDB in a single step rather than the
0 → remote-gRPC → local-MMDB path staging took.

Scoped to something-01 (eu-central1) as the canary. something-00
follows in a separate PR. The eu-south1 something-01 variants
stay on the CF-header path for now (no geoip service deployed in
us-south1).

To revert: drop GEOIP_MMDB_DIR and the noop client takes over again
on the next revision rollout.
```

Nothing is lost in the split. `git blame` on the line points at the commit. The commit message and the PR carry the rollout story with the date attached. The reader who wants to know when and how local-MMDB got turned on is one hop away. The reader who just wants to know what the flag does in steady state reads the comment and stops.

This is the other failure mode of comments, the counterpart to the one covered later under "Stale comments are debt". That section is about comments that go wrong because the code drifts under them. This one is about comments that go wrong because time passes under them. The second is more dangerous than the first. Nothing in the development process will ever trigger a fix. No test fails, no lint fires, no PR touches the surrounding code. The comment just becomes wrong on its own, silently, in production. The defense is upstream of the comment: catch the perishable sentences before they land, and route them to the timestamped artifacts that can carry them safely.

### Quantitative reasoning that resists drift

Comments on numbers are some of the most valuable and most often skipped. A bare constant invites tweaking. A constant with reasoning resists it. From the same PR, the memory limit on the core-api service:

```hcl
# Memory raised from 2 GiB → 4 GiB to leave room for the GeoIP MMDB
# resident in page cache. pkg/geoip (platform-go #421) mmaps roughly
# 800 MB of dataset from /data, and those pages count against the
# Cloud Run memory limit. At 2 GiB the MMDB alone eats 40% of the
# envelope, leaving nothing for a realistic Go heap. 4 GiB gives
# ~3 GiB of headroom over the MMDB residency for heap and page-cache
# slack.
limits = {
  cpu    = "4000m"
  memory = "4Gi"
}
```

Without the comment, `memory = "4Gi"` is a number waiting to be optimized down by the next cost-cutting sweep. With the comment, the cost-cutter knows that 4 GiB is the answer to a specific equation: 800 MB mmap residency + Go heap + page-cache slack. If they want to reduce it, they have to reduce the mmap dataset, reduce the heap, or accept less headroom. The comment turns a magic number into a constraint with terms.

### Safety contracts on public APIs

This one is a Godoc comment on an HTTP roundtripper option in Go:

```go
// WithRequestBodyLogging turns on request body capture on this RoundTripper.
//
// Enable this with care. Captured bodies can contain sensitive data, and the
// capture path does not impose its own size cap. It is the caller's
// responsibility to confirm that body logging is appropriate for the traffic
// flowing through this transport. The decision of what to emit versus redact
// is delegated to the configured logger; see log.Logger.LogCanonicalLine for
// the contract that governs that.
func WithRequestBodyLogging() RoundTripperOption {
    return func(rt *RoundTripper) {
        rt.logRequestBody = true
    }
}
```

The function signature is three words and a return type. The Godoc is a contract. It tells the caller what the option does, where the risk lives (sensitive data, unbounded size), where responsibility for safety sits (the caller), and where to look for the redaction policy that determines what actually hits the logs. A model writing new code that calls `WithRequestBodyLogging()` has every signal it needs to either reject the call in a sensitive context or pair it with the appropriate redaction config. A model with only the function name has nothing, and will happily turn it on inside a payment handler.

## What to avoid

The inverse of good comments and context, and why comments got a bad name for themselves.

A PR:

```text
chore: Add XYZ on core Cloud Run service

**Describe your PR**

 - Add XYZ support on Cloud Run module
 - Add XYZ on core Cloud Run service

** Checklist before merging**

 [x] Check the terraform plan on Terraform Cloud
 [x] Approve the terraform apply on Terraform Cloud after merging the PR
```

There are just two bullets restating the diff at the bullet level, plus a process checklist. There is:

- No why.
- No risk.
- No operational notes.
- No rollback plan.
- No mention of which paths XYZ now protects.
- Who can authenticate against it.
- What changes for on-call.
- Why it was changed.
- What the failure mode is if the XYZ layer misbehaves.

The PR landed with zero conversation, it is the mechanical-changelist anti-pattern.

If this change breaks something, whoever is on call has zero context. The author had all the context, and has not shared it.

## Removing context

Changes to comment context should be documented in commits, PRs, and treated just the same as a change to code. Not lumped in with other changes or cleanup.

The previous PR adding XYZ to the core service also deletes this comment block from the same file:

```hcl
# Use ABANDON, not DISABLE, as the deletion policy here.
#
# When the encrypted secret file changes, Terraform replaces this
# resource. Under DISABLE, the previous Secret Manager version is
# disabled as part of the replacement. Cloud Run revisions resolve
# and pin a specific Secret Manager version at deploy time (not at
# container start), so any revision still serving traffic, or one
# we later roll back to, can end up bound to a version that is now
# disabled. Its instances will then fail to start on the next cycle.
#
# We learned this the hard way. A Cloud Run service was still
# routing a slice of traffic to an older revision; that revision
# was pinned to a Secret Manager version a subsequent deploy had
# disabled; when its instances cycled, the new ones could not
# start because the pinned version was no longer readable. The
# service did not recover until the version was manually re-enabled.
#
# ABANDON leaves prior versions in place so any revision still
# referencing them continues to function across instance cycles
# and rollbacks. Old versions accumulate and need to be cleaned
# up out of band (e.g. explicit disable when rotating a leaked
# secret).
deletion_policy = "ABANDON"
```

None of these comments are about XYZ. None of them are about anything in the stated scope of the PR. They were collateral.

Maybe the change was relevant, but it's unknown from the PR or the commit messages. The PR description does not give the reviewer a reason to look hard at unrelated parts of the diff. The reviewer skims, sees that the XYZ changes are reasonable, ticks the boxes, and merges.

Comment deletions are silent: no test fails, no linter fires, no CI check turns red. The git history records the loss, but only if someone thinks to look. They will not think to look. The next engineer to ask "why is `deletion_policy` set to `ABANDON` instead of the safer-sounding `DISABLE`?" gets no answer from the file. They can spelunk back through git, or they can change it to `DISABLE` and reproduce the original outage.

The model fares worse. It has no incident history at all. It sees `deletion_policy = "ABANDON"` and has every incentive to suggest "switch to `DISABLE` for cleaner state management." That suggestion was wrong for a documented reason that no longer exists in the codebase. The fence post is gone. The trap is reset.

This is context death. Not a single catastrophic deletion. A small "chore" PR with a two-bullet description and zero conversation, quietly removing the artifacts that explain why the system is the way it is.

Multiply by a handful of these a quarter, and a codebase loses its institutional memory in a year. Exactly when it most needs that memory to survive contact with AI tools that will confidently propose changes the comments existed to prevent.

If you remove context, treat it as a logical change: create a PR, discuss it, leave breadcrumbs.

## Code is the syntax, comments are the context

The "self-documenting code" movement was a useful corrective to a previous era of redundant, decaying noise.

Good naming, small functions, clear control flow: these are the floor. They tell you what the code does. But they rarely tell you why.

The why is where bugs live. The why is what a tired engineer reaches for at 2am when the system breaks in production.

Consider a function with a 47ms sleep before a retry. The code shows the sleep. Nothing in the code tells you that without it, a downstream rate limiter trips and the entire fleet retries in lockstep, taking out the upstream service. Without the comment, that line gets removed in the next refactor. Six months later someone is reading a postmortem.

Comments earn their place when they explain decisions, tradeoffs, non-obvious constraints, links to incidents, and external references (RFCs, vendor docs, internal tickets). They do not earn their place when they restate the code.

The test is simple: if you deleted this comment, what would the reader lose?

If the answer is "nothing they cannot easily recover from the code itself," delete it. Otherwise, keep it.

## Reading is triage, not consumption

The mental model that helps: comments are road signs. A sign warns of a sharp curve, points to an exit, marks a hazard.

A driver does not read every sign with equal attention. They scan, and the ones that matter pull the eye in.

The driver who reads every sign at full attention crashes. The driver who reads none crashes too.

A codebase covered in comments is not a failure of restraint. It is a failure of the reader's skill if they cannot move through it without drowning.

Selective scanning — the ability to skim past explanatory comments when the code is what you need, and to slow down on warnings when intent is what you need — is a skill that gets developed. Junior engineers read every word. Senior engineers triage.

A good editor helps. Syntax highlighting can dim comments to a low-contrast gray so they fade when you scan code, and snap back when you focus on a section. Italic comments, font ligatures, semantic highlighting that distinguishes `TODO` from doc comments from inline notes: this is not just decoration. Pick an editor and theme that match the way your eyes work, and learn the keystrokes that fold or hide comment blocks when you need the bare structure.

The corollary: write comments that earn the eye. Use conventions. Examples often used are `// SAFETY:` for invariants that must hold, `// PERF:` for hot paths, `// HACK:` for known compromises with a reason, `// TODO(name):` for owned debt, `// NOTE:` for context that is not a warning. These are signs with shape. A reader scanning for hazards finds them. A reader on the happy path skips them. The shape is the first read; the words are the second.

## Stale comments are debt

A comment that no longer matches the code is worse than no comment at all. It actively misleads. The human reader trusts it, builds a mental model around it, and ships a bug. The LLM trusts it, generates code that satisfies the stated invariant rather than the actual one, and ships a worse bug, because the model has no way to detect the drift between text and code.

Treat comments as code. They have an owner: whoever last touched the lines around them. They have an audience: the human or model that reads them next. They have a failure mode: misleading that reader. They have an entropy budget that erodes every time the surrounding code changes and the comment does not.

The rules follow:

- When you change code, re-read the comments above, beside, and inside the function. If they no longer hold, update them in the same commit. Not the next commit. The same one.
- When a PR touches a function with a doc comment, the doc comment is absolutely in scope for review. A reviewer who lets a stale comment ship is signing off on the misinformation.
- Code review checklists should include "do the comments still match the code." It is as cheap to ask as "do the tests still pass."
- When you delete code, audit the comments around it. Orphaned comments rot faster than dead code because nothing fails when they are wrong. They just lie quietly until someone believes them.

Not maintaining comments is technical debt. Human readers pay in confusion. Model readers pay in confident wrong output. The interest compounds quietly until someone runs the production query that the stale invariant said could never happen.

## Commit messages are the audit trail of intent

A commit is a snapshot of a change. A commit message is a snapshot of why that change happened at that moment.

`fix bug` is malpractice. `fix tests` is worse. A commit message worth writing answers four questions: what problem, what cause, what fix, what verification.

Compare:

```text
fix bug
```

to:

```text
Fix race condition in item refresh

When two requests arrived within the same millisecond, both
observed an expired item and both attempted to refresh. The
second refresh invalidated the first refresh's new item,
causing intermittent 401s for the next minute.

Wrap the refresh in a singleflight group keyed by the id.

Verified with a load test that previously reproduced the bug
within 30 seconds; no failures over a 10 minute run.
Related: incident #1234, ticket ITEM-1223
```

The first commit is just graffiti. The second is engineering.

`git blame` becomes a time machine, but only if commits are atomic and the messages are coherent. Squashing 47 commits called `asdf` into a single PR commit called `stuff` destroys the archaeology. The history exists to answer questions the original author cannot anticipate. Make it answerable.

## PRs are the courtroom of the change

A pull request is where a change is defended to your future self and your colleagues. A good PR description answers questions the diff alone cannot:

- What problem is being solved.
- Why this approach.
- What alternatives were considered, and why they were rejected.
- What was deliberately not changed, and why.
- What risks remain.
- The test plan. The rollback plan. The migration plan, if any.
- Operational breadcrumbs for the engineer paged at 3am when this breaks in production: (1) which dashboards matter, (2) which logs to grep, (3) the new failure modes this change introduces, (4) the metrics that should move and in which direction.

You are not documenting for the reviewer today. You are documenting for the on-call who has never seen this code and has just a couple of minutes to decide whether to roll back.

A PR description that says "see commits" is a PR that will be impossible to understand in six months. The video call where the design was hashed out left no record. The PR description is the only place where that conversation is preserved in a form your future colleagues can find.

Just as useless is the mechanical changelog: "Add `processOrder` function. Delete unused import. Rename `foo` to `bar`. Update tests." The diff already says this. Restating it in English consumes the one piece of real estate dedicated to intent and wastes it on inventory. If your PR description could be regenerated by running `git diff --stat` through a thesaurus, you have not written a PR description. You have written a worse version of the diff.

The bar is not "did I document this enough for the reviewer today." The bar is "will the next engineer who breaks this code understand the original intent without finding me."

## Operational Slack is documentation, not chat

The same logic extends to operational chat. Incident channels, on-call handoffs, "I noticed something weird in prod" threads, "why did we do it this way" questions, debug sessions, postmortems-in-progress. These messages feel ephemeral. They are not.

Slack is searchable, archived, indexed, and increasingly piped into RAG systems alongside the codebase. Two years from now you will hit a problem that looks vaguely familiar. You will search Slack for the keyword you remember. You will find a thread where past-you debugged the same issue and worked out the cause. If past-you wrote "yeah found it, was a stale cache, fixed", you are starting the investigation over. If past-you wrote three paragraphs, you are done in five minutes. This happens. It happens often. It will happen to you, repeatedly, and every time it does you will either thank or curse the version of you that typed the original message.

The temptation is to optimize for the people in the channel right now. They have context. They can fill in the gaps. Three of them are already on the same Tuple call. A short message feels courteous; a long message feels like noise.

This is the wrong audience. The right audience is yourself in five years, the new hire in two years onboarding to this service, the on-call who inherits this rotation next quarter, and the RAG system feeding Claude or Cursor when someone asks "has this happened before." None of these readers have the context the channel had at the time. They will have a search box and your message. That is all.

The technique that works: TLDR at the top for the scanners, then be overly verbose below. The TLDR is the one-liner that lets a present-tense reader skip the rest. The verbose section is for the future reader who has no context and needs the full causal chain. Both audiences are served by the same message.

The same principle has a second shape for ongoing production changes. A deploy that takes an hour. A migration that runs overnight. A rolling restart across cells. A debugging session that gains and loses leads through the day. Do not post a single summary at the end. Start a thread and update it as the state changes.

The shape: the parent message names the operation and the expected blast radius. Each reply captures a new state, in order.

A reader looking at the channel three months later treats the thread like a stack. The last reply is the current state. Walking back up the thread reconstructs the timeline: when each phase started, when each anomaly appeared, what was tried, what each decision was based on. The same information could in principle be recovered from Grafana, deploy logs, and the incident page, but only by someone who knows to look there and has the access. The Slack thread is the human-readable index over all of it.

This pattern pays off twice. In the moment, anyone joining the situation catches up without having to ask. After the fact, the postmortem author, the next on-call who sees a similar pattern, and the RAG system feeding an AI assistant get a structured account of what happened in what order. A flat dump posted after everything is over loses the ordering and loses the decision points. A thread preserves both.

You are not optimizing for the person scanning the channel. You are optimizing for future-you, future-colleagues, and the AI that future-you will ask "has this happened before." Be overly verbose. Add the TLDR so the scanner in the present can skip past. Then write the paragraphs that the future searcher will be grateful for. Nobody has ever regretted finding a thread that was too detailed. Plenty of people have regretted finding one that was not.

## Comments are how seniors teach

There is another audience for all of this. Not future-you, not the on-call, not the LLM. The junior engineer who joins the team next quarter and starts reading code to figure out how the system works.

For most engineers, the path to understanding a real codebase is browsing. They open the file that handles the thing they have been asked to change. They scroll. They follow function definitions. They form a model from what they see. The good ones do this constantly, beyond the immediate task, building map territory in their heads. They are looking, in the moment, at exactly the lines a senior engineer wrote years ago. If those lines explain why they are the way they are, the senior has just taught a lesson without being in the room. If they do not, the junior has to either ask, or guess.

Asking has costs. In a growing company, the people who could answer are increasingly hard to find, busy, or gone. The institutional memory does not scale with headcount. A senior who took half an hour to write a careful comment three years ago is now teaching a new hire who joined this week, with nobody scheduling a meeting. That is leverage. Comments are how seniors teach when they cannot be in the room.

Guessing has worse costs. The junior reads the code, sees what it does, and forms a theory about why. The theory is often wrong in subtle ways. They ship a change consistent with the theory. The bug surfaces in production. Or, worse, it does not surface for months, until the assumption that prevented it is no longer enforced anywhere and a different change finally trips the wire.

Security is where this asymmetry bites hardest. Most security-relevant code does not look like security code. It looks like a redundant check, a strange ordering, a defensive copy, a constant-time compare, a missing optimization. Every one of those is something a junior reader could "clean up." Every one of those, cleaned up, introduces a vulnerability.

Consider the difference:

```go
// Constant-time HMAC comparison. A naive == comparison leaks the length
// of the matching prefix through timing, which an attacker can use to
// recover the expected MAC byte-by-byte across many forged requests.
// hmac.Equal runs in time proportional to the longer input regardless
// of where the first mismatch falls.
if !hmac.Equal(expected, got) {
    return ErrInvalidSignature
}
```

versus

```go
if !hmac.Equal(expected, got) {
    return ErrInvalidSignature
}
```

The second version is what a junior engineer "improving readability" might leave behind if they were unsure why `hmac.Equal` was being used instead of `bytes.Equal` or `==`. The first version teaches them the answer the moment they read the function, with no senior available to explain it. The same code, two different effects on the team's collective competence.

The same pattern repeats across the security surface. Validate before deserialize, to block gadget-chain attacks. Reject path components containing `..` even after canonicalization, because the canonicalization library has had CVEs. Rate-limit per IP and per account, not just per account, because per-account alone lets an attacker enumerate accounts cheaply. Output-encode at the rendering boundary, not at input, because input rules drift while output context is fixed. Each of these is an "obvious" simplification waiting for a junior engineer who does not have the attack model in their head.

The comment is the attack model, written down at the point of impact. It is also, increasingly, the only place the attack model lives. Security wikis go stale. Threat models get filed in Confluence spaces nobody onboards into. Pen test reports are PDFs in an S3 bucket. The thing a new engineer will actually read, with full attention, is the code they are about to change. Put the security reasoning there.

This generalizes beyond security. Performance edge cases, race conditions, ordering constraints, vendor quirks, undocumented protocol behavior, the lessons of a postmortem nobody re-reads: the same logic applies. The comment at the point of impact teaches the next reader who needs the lesson, on the schedule they need it. No meeting required, no Slack ping, no "oh you should have asked me first." The teaching happens when the reading happens.

A growing team cannot scale senior attention by repetition. It scales by writing the attention down where the next reader will find it. The codebase becomes the curriculum.

## The LLM rewrites the math on all of this

Until recently, we all wrote comments and commit messages for humans. The audience was your future self and the colleagues who would inherit the code. The payoff is real, but it compounded slowly. So many teams made a rational tradeoff and underinvested in comments and contextual info.

I'd argue that tradeoff was never right, but it is clear it no longer works.

The audience now includes every AI tool that reads the codebase. CodeRabbit, Claude Code, Cursor, internal RAG systems, agents that open PRs of their own. These tools all work the same way: retrieve relevant context, put it in front of a model, predict.

The richer the context, the better the prediction. The thinner the context, the more the model pattern-matches against whatever it saw during training, which may have nothing to do with your codebase, your constraints, or your intent.

The model cannot infer what is not in the text. It cannot know that this service is PCI-scoped. It cannot know that this function must complete in under 50ms because it is on the auth hot path. It cannot know that this seemingly redundant validation exists because of a CVE patched last year. Unless you wrote it down.

Worse: confidently wrong is the worst failure mode. A junior engineer who does not know something asks. A model that does not know something invents. The output looks plausible. The tests pass. The PR gets merged. The bug ships.

The comment that explained the why to humans is now the comment that prevents an LLM from confidently breaking your system. The commit message that captured the cause of last quarter's outage is now the document that prevents an AI agent from reintroducing the same bug. The PR description that documented the alternatives you rejected is now the context that stops a model from suggesting one of those alternatives again.

This is not a future problem. It is the current problem.

## Code is the output. The work is curation.

Step back from the disciplines and a larger shift comes into view: the job itself has changed.

For most of the history of software engineering, the bottleneck was implementation. You knew, roughly, what to build. You had to type it, debug it, ship it, maintain it. Code was the work. Documentation was a side activity, the part of the job that was always being deferred to next quarter.

That model is breaking down faster than most teams are admitting. Production-grade code can be drafted by a model in seconds. The bottleneck has moved up the stack. The hard part is no longer typing the function. The hard part is knowing what function to write, why this approach and not the obvious one, which constraints are important, which past decisions are still binding, and what the actual problem is underneath the stated problem.

All of that is context. All of it lives somewhere: in someone's head, in a Slack thread from 2023, in a postmortem nobody re-reads, in a comment that was deleted three PRs ago, in a customer conversation someone took notes on, in a design doc someone wrote and nobody linked. The engineer's job, increasingly, is to find that context, preserve it where the next reader will need it, and route it through the codebase, the commit history, the PRs, and the chat so that it survives the person who first encountered it.

That is curation. And in a growing company, it is what separates an engineer who is genuinely valuable from one who is producing commodity output. Anyone, human or model, can produce code that compiles. Far fewer can produce the right code for this system given everything that happened before this moment. Fewer still can transmit the why of their choice forward so that the next person, human or model, can do the same.

This reframes every discipline in this article. Comments, commit messages, PR descriptions, Slack threads, ADRs, runbooks: they are not extras tacked onto the real job of writing code. They are the real job. The code is the byproduct. The artifact that lasts and compounds is the curated context around it.

If you measure your output in lines of code, features shipped, or tickets closed, you are measuring the part that is becoming commodity. The part that is not commodity is what you preserved, what you wrote down, what you transmitted to the next reader. That is the work. Measure that. Reward that. Hire for that.

## What to do about it

Treat the codebase as a knowledge base, not a script.

- Write comments at the points where someone, human or model, would reasonably try to do the wrong thing. Document non-obvious constraints. Link to incidents, RFCs, tickets.
- Update comments in the same commit as the code they describe.
- Review them like code. A stale comment that ships is a bug that ships.
- Make "comments match the code" a standing review question, alongside "tests still pass."
- Develop the skill of selective scanning, and configure your editor to support it. Dim comments, fold them, color-code your conventions. The goal is to glide past explanation when you want the code, and stop on warnings when you want the intent.
- Write commit messages with structure. Problem, cause, fix, verification. Link the ticket and the incident. Treat the message as the artifact, not the diff.
- Write PR descriptions that survive separation from the conversation that produced them. Quote the Slack thread if you have to. Inline the design doc. Future colleagues will not have the context window you do today.
- Use Architecture Decision Records for the big calls. They are the constitutional layer of the codebase. Why we chose a 3rd-party managed PostgreSQL service over RDS. Why we kept the monolith. Why we implemented our own load balancer instead of something off-the-shelf. A good ADR repays its cost ten times over the first time a new engineer asks "why did we build it this way."

## The bottom line

Code without context is a fossil. You can see the shape but not the intent. For decades, teams got away with thin documentation because the humans who wrote the code stayed, or because the next humans had enough shared culture to fill in the gaps.

That ground is shifting. Teams turn over faster. AI tools handle a growing share of the surface area. The shared culture has to be written down or it does not exist.

Context is king. Comments are the context. Commit messages are the context. PR descriptions are the context. Write them as if the next reader is a stranger, because increasingly, the next reader is not a person at all.
