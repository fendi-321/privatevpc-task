# DevOps Assessment Questionnaire — `privatevpc-task`

A structured DevOps questionnaire **answered against this repository's actual code**.
Every answer cites the file it is derived from, plus a compliance status and a recommendation.

- **Repository:** `privatevpc-task` (remote: `github.com/fendi-321/privatevpc-task`)
- **Owner:** Muhamad Affindi bin Kamarudin
- **Domain:** AWS hub-and-spoke network (Perimeter = hub, DevOps = spoke) in `ap-southeast-1`
- **Tooling:** Terraform (`hashicorp/aws ~> 5.0`), GitLab CI, Node + Puppeteer (diagram rendering)
- **Scope reviewed:** `README.md`, `Training1/README.md`, `Training1/.gitlab-ci.yml`, all `*.tf`
  under `Training1/`, `package.json`, `.gitignore`, `SRE_Interview_QA.md`, diagram artifacts

### Legend

| Status | Meaning |
| ------ | ------- |
| ✅ Implemented | Present, working, aligned with good practice |
| ⚠️ Partial / Risk | Exists but with gaps, fragility, or environment-specific behaviour |
| ❌ Missing | Not present in the repository |

---

## 1. Repository, Ownership & Governance

### Q1. What is this repository responsible for, and who owns it?

**Answer.** It provisions and documents a **hub-and-spoke AWS network** used as a secured DevOps
environment: private workloads in the DevOps spoke reach the internet only via the Perimeter hub's
NAT Gateway, and are administered without public exposure through SSM Session Manager. The repo
holds the IaC, the CI pipeline, the architecture documentation, and the diagram-rendering tooling.

**Evidence:** `README.md:1-32`, `README.md:802-806`, `Training1/README.md:3`

**Status:** ✅ Implemented

**Recommendation.** Add a `CODEOWNERS` file so review ownership is machine-enforced instead of
stated only in prose.

---

### Q2. Is there a documented branch / commit / review policy?

**Answer.** No. The repo has 3 commits (`abb6fe6` Initial commit, `53d6e32` Update repo, `599b6`
Delete) applied directly on `master`, with no branch-protection config, PR/MR template, or written
policy committed. `master` is the default branch.

**Evidence:** `git log --oneline`; `git status` → `On branch master`

**Status:** ❌ Missing

**Recommendation.** Move to a protected default branch with short-lived feature branches and
require MR approval before the apply jobs can run (see Q14, Q19).

---

### Q3. Is there a change log / release mechanism?

**Answer.** Only manual documentation versioning: the README footer states `Version: 1.0` and
`Status: Production Ready` with a "Last Updated" date. There is no `CHANGELOG.md`, no git tag, and
no release job in the pipeline.

**Evidence:** `README.md:829-832`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Tag infrastructure milestones (`v1.0.0`) and maintain a `CHANGELOG.md`; the
apply jobs are the natural place to cut those tags.

---

### Q4. Are the deliverable working files actually committed?

**Answer.** Not fully. `git status` reports several artifacts as **untracked** and therefore absent
from CI and from any clone: `SRE_Interview_QA.md`, `aws-hub-spoke-architecture.json`,
`aws-hub-spoke-architecture.html`, `aws-hub-spoke-architecture.deliver.json`, the
`*.visual-check.*` PNG/JSON files, and `aws-hub-spoke-architecture.visual-check.html`. Separately,
`render-diagram.mjs` is a committed but **0-byte** file.

**Evidence:** `git status --porcelain`; file listing shows `render-diagram.mjs` length `0`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Commit the intended documentation artifacts, delete the empty
`render-diagram.mjs`, and git-ignore generated binaries that can be rebuilt by
`render-diagram.cjs`.

---
## 2. Infrastructure as Code (Terraform)

### Q5. Which IaC tool and provider versions are used, and are they pinned?

**Answer.** Terraform with the AWS provider constrained to `~> 5.0` in both root stacks. There is
**no `required_version`** constraint on Terraform itself, and CI runs
`hashicorp/terraform:latest` — so the CLI version floats and the pipeline can break without any
repository change.

**Evidence:** `Training1/Perimeter/providers.tf:1-8`, `Training1/DevOps/providers.tf:1-8`,
`Training1/.gitlab-ci.yml:10-14`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add `terraform { required_version = "~> 1.7" }` to each stack and pin the CI
image to a specific tag (e.g. `hashicorp/terraform:1.7.5`) instead of `latest`.

---

### Q6. Is the code modular and DRY?

**Answer.** Yes. Four reusable modules encapsulate the networking primitives and each root stack
composes them:

| Module | Purpose | Outputs |
| ------ | ------- | ------- |
| `modules/vpc` | VPC with DNS support + hostnames | `vpc_id`, `cidr_block` |
| `modules/subnet` | Subnet + nested `rt` + nested `nacl`, with auto-association | `subnet_id`, `route_table_id` |
| `modules/rt` | Route table + subnet association | `route_table_id` |
| `modules/nacl` | Network ACL + subnet association | *(none)* |

The `subnet` module nestingly calls `rt` and `nacl`, so **every subnet automatically receives one
route table and one NACL** — enforcing per-subnet isolation by construction rather than convention.

**Evidence:** `Training1/modules/subnet/main.tf:10-22`, `Training1/modules/rt/outputs.tf:1-4`,
`Training1/modules/vpc/outputs.tf:1-9`

**Status:** ✅ Implemented

**Recommendation.** Keep the pattern; consider adding an `is_public` input (with conditional IGW/NAT
routes) and NACL rule inputs so public/private subnets are expressed declaratively.

---

### Q7. Is `terraform fmt` / `validate` / linting enforced?

**Answer.** `terraform validate` runs in CI for both stacks (`init -backend=false` then `validate`).
`terraform fmt`, **tflint**, **checkov/tfsec**, and pre-commit hooks are **not** configured.
`compute.tf` is visibly unformatted (misaligned `iam_instance_profile` attribute), proving
`fmt -check` is not gating anything.

**Evidence:** `Training1/.gitlab-ci.yml:24-29,56-61`, `Training1/DevOps/compute.tf:44-52`,
`README.md:768` (fmt/tflint listed only as a *future* enhancement)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a fast `lint` stage running `terraform fmt -check -recursive` + `tflint` +
`checkov` (or `trivy config`) before plan. Highest value-per-effort pipeline addition.

---

### Q8. How is Terraform state stored and locked?

**Answer.** **Locally, in plaintext, with no locking.** Neither root stack declares a `backend`
block, so state lives in the working directory (`terraform.tfstate`). There is no S3 + DynamoDB
(or Terraform Cloud) remote backend, no state locking, and no versioning. `.gitignore` correctly
excludes `*.tfstate`/`*.tfvars`, so secrets are not committed — but that also means state is
**ephemeral in CI** and cannot be safely shared between runners.

**Evidence:** no `backend` block in `Training1/Perimeter/*.tf` or `Training1/DevOps/*.tf`;
`.gitignore:8-12`; `README.md:128` (the layout diagram labels it `# State files (local backend)`);
`SRE_Interview_QA.md` Q6 names this as an outstanding gap to fix with S3 + DynamoDB

**Status:** ❌ Missing (highest-impact IaC gap)

**Recommendation.** Migrate both stacks to a versioned, encrypted S3 backend with DynamoDB locking
(or `use_lockfile = true` on Terraform ≥ 1.10), one key per stack
(`perimeter/terraform.tfstate`, `devops/terraform.tfstate`).

---
### Q9. How does the DevOps stack consume the Perimeter stack's outputs?

**Answer.** Via `data.terraform_remote_state` — pointed at a **local backend** and specifically at the
**`.backup`** file:

```hcl
data "terraform_remote_state" "perimeter" {
  backend = "local"
  config  = { path = "${path.module}/../Perimeter/terraform.tfstate.backup" }
}
```

It consumes `outputs.tgw_id` and `outputs.perimeter_vpc_cidr`. This is brittle: it assumes a sibling
`Perimeter/` directory exists inside the CI runner, reads a *backup* file rather than live state, and
breaks if the two jobs execute on different runners. `Training1/DevOps/variables.tf` documents that
explicit variables were deliberately replaced by this approach.

**Evidence:** `Training1/DevOps/remote_state.tf:1-12`, `Training1/DevOps/routing.tf:5,10-11`,
`Training1/DevOps/tgw.tf:4`, `Training1/DevOps/variables.tf:1-4`

**Status:** ⚠️ Partial / Risk (works locally, brittle in CI)

**Recommendation.** Once the S3 backend (Q8) exists, switch to `backend = "s3"` with the `perimeter`
key. Until then, make the existing GitLab `dotenv` pass-through (Q16: `TF_VAR_tgw_id`,
`TF_VAR_perimeter_vpc_cidr`) the single supported mechanism.

---

### Q10. Are variables parameterized, and are there environment overrides?

**Answer.** Barely. The region (`ap-southeast-1`) and every CIDR block are **hard-coded literals** in
the stack files rather than variables. `Training1/DevOps/variables.tf` declares no variables at all
(only comments). There are no `.tfvars` files (and they are git-ignored), so there is exactly one
hard-coded environment instead of a dev/staging/prod matrix.

**Evidence:** `Training1/Perimeter/providers.tf:10-12`, `Training1/Perimeter/network.tf:1-33`,
`Training1/DevOps/network.tf:1-19`, `.gitignore:12-13`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Lift region, CIDR ranges, instance type, and tags into variables with defaults,
and drive per-environment values from `*.tfvars` / CI variables.

---

### Q11. Are resources tagged consistently?

**Answer.** Partially. A `Name` tag is applied on VPCs, subnets, route tables, NACLs, IGW, EIP, NAT GW,
and TGW attachments. There is **no** standard tag set (`Environment`, `Owner`, `Project`,
`CostCenter`, `ManagedBy`), which blocks cost allocation, ownership queries, and tag-based policy.

**Evidence:** `Training1/modules/vpc/main.tf:6-8`, `Training1/modules/rt/main.tf:4-6`,
`Training1/Perimeter/tgw.tf:5-7` (no shared tag variables exist)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a provider-level `default_tags` block (project, owner, environment) and
remove the duplicated per-resource tags.

---

### Q12. Is there automated testing of the infrastructure code?

**Answer.** No. There are no Terratest, `terraform test`, or Kitchen-Terraform files and no unit-style
assertions. Verification relies entirely on `terraform validate` plus human review of `plan` output.
The root `package.json` "test" script is an intentional placeholder that exits 1.

**Evidence:** file inventory under `Training1/`; `Training1/.gitlab-ci.yml`; `package.json:6-8`

**Status:** ❌ Missing

**Recommendation.** Begin with native `terraform test` (≥ 1.6) or Terratest for module contracts, e.g.
"the `subnet` module always yields exactly one route-table association and one NACL association".

---
## 3. CI/CD Pipeline (GitLab)

### Q13. Describe the pipeline topology.

**Answer.** `.gitlab-ci.yml` defines six sequential stages, applying the Perimeter stack before the
DevOps stack (correct ordering, since DevOps depends on Perimeter outputs):

```
perimeter-validate → perimeter-plan → perimeter-apply
   → devops-validate → devops-plan → devops-apply
```

Every job uses the `hashicorp/terraform:latest` image with an entrypoint override, and a global
`before_script` that exports AWS credentials, sets `AWS_REGION="ap-southeast-1"`, and runs
`rm -rf .terraform` (to force a clean init).

**Evidence:** `Training1/.gitlab-ci.yml:1-22`

**Status:** ✅ Implemented (structure is sound)

**Recommendation.** Split validate/plan/apply into separate stages *per stack* as done here —
keep it — but pin the image and add a `lint` stage ahead of `*-validate` (Q7).

---

### Q14. Where are the manual approval gates, and are they sufficient?

**Answer.** Only `devops-network-apply` is gated with `when: manual`. The more privileged
`perimeter-network-apply` — which creates the shared hub, IGW, NAT Gateway, and Transit Gateway —
runs `terraform apply -auto-approve` **automatically** with no human gate. Since the Perimeter hub is
the central egress for every spoke, an unreviewed automatic apply is the riskiest step in the pipeline.

**Evidence:** `Training1/.gitlab-ci.yml:41-53` (perimeter apply, no `when: manual`) vs.
`Training1/.gitlab-ci.yml:73-81` (`when: manual` on devops apply)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add `when: manual` (ideally scoped to a protected `production` environment with a
required approver) to `perimeter-network-apply`, and use GitLab `environment:` to record deployments.

---

### Q15. Is the applied artifact the same one that was planned?

**Answer.** Mostly. Both plan jobs write `plan.tfplan` and publish it as an artifact; both apply jobs
run `terraform apply -auto-approve plan.tfplan`, so the reviewed plan is what gets applied.
However `perimeter-network-apply` does **not** declare `dependencies: [perimeter-network-plan]`,
whereas `devops-network-apply` does — so the Perimeter apply relies on default artifact inheritance
rather than an explicit contract.

**Evidence:** `Training1/.gitlab-ci.yml:31-53`, `Training1/.gitlab-ci.yml:63-81`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add the explicit `dependencies` to the Perimeter apply job and consider a
`plan -detailed-exitcode` gate in MR pipelines.

---

### Q16. How is state/data passed between the two stacks in CI?

**Answer.** After applying, the Perimeter job writes `TF_VAR_tgw_id` and `TF_VAR_perimeter_vpc_cidr`
into `perimeter.env` and publishes it as a GitLab `dotenv` artifact. This is the idiomatic GitLab
mechanism — but it is currently **unused**, because the DevOps stack reads a local `.backup` state file
instead (Q9). Also note `perimeter.env` is written into `Perimeter/` yet the artifact is declared as
`Perimeter/perimeter.env`, and the downstream DevOps jobs do **not** consume it.

**Evidence:** `Training1/.gitlab-ci.yml:47-51`, `Training1/.gitlab-ci.yml:73-81`,
`Training1/DevOps/remote_state.tf:10`

**Status:** ⚠️ Partial / Risk (mechanism exists, wiring is dead)

**Recommendation.** Either consume the dotenv variables in the DevOps jobs (add
`needs: [{job: perimeter-network-apply, artifacts: true}]`) or delete the dotenv step once an S3
remote backend is in place. Do not keep both mechanisms.

---

### Q17. Does the pipeline cache or reuse provider downloads?

**Answer.** No. The global `before_script` runs `rm -rf .terraform` on **every job**, which discards
the provider plugin cache so each of the six jobs re-downloads the AWS provider. There is no GitLab
`cache:` block and no `TF_PLUGIN_CACHE_DIR`, so pipeline runtime is inflated and depends on registry
availability.

**Evidence:** `Training1/.gitlab-ci.yml:16-21`; the pipeline has no `cache:` key

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a `cache:` (or `TF_PLUGIN_CACHE_DIR`) keyed on `.terraform.lock.hcl`, and
commit the lock file (currently git-ignored via `.gitignore:7`) so provider versions are reproducible.

---

### Q18. Are pipeline failures and results visible to the team?

**Answer.** Only through GitLab's own job UI. There is no notification (Slack, email, SNS), no
`artifacts:reports` for plan summaries, and no status badge. Plan output is not surfaced as an MR
comment, so reviewers must open the job log to see proposed changes.

**Evidence:** `Training1/.gitlab-ci.yml` (no notification or MR-integration keys anywhere)

**Status:** ❌ Missing

**Recommendation.** Post plan summaries to MRs and route pipeline failures to a team channel.

---
### Q19. How are cloud credentials supplied to the pipeline?

**Answer.** Through static, long-lived IAM access keys exported from GitLab CI/CD variables:
`export AWS_ACCESS_KEY_ID` / `export AWS_SECRET_ACCESS_KEY`. There is no OIDC/`id_tokens`
workload-identity federation, no `AWS_PROFILE`, and no scoping of the keys to a single stack, so one
key pair can create or destroy the entire network. Rotation and auditability are therefore manual.

**Evidence:** `Training1/.gitlab-ci.yml:16-19`; mitigation advice is acknowledged in
`SRE_Interview_QA.md` Q30

**Status:** ⚠️ Partial / Risk

**Recommendation.** Replace static keys with GitLab OIDC → `aws-actions`-style `sts:AssumeRoleWithWebIdentity`
(or IRSA if self-hosted on EKS), store nothing long-lived, and scope the assumed role ARN per
environment.

---

### Q20. Is there drift detection and a rollback story?

**Answer.** No. There is no scheduled `terraform plan` against live state, no drift alerting, and no
documented rollback other than "re-run the pipeline". Rollback is also constrained by the missing
remote state (Q8): without durable, shared state a rollback plan cannot be trusted.

**Evidence:** `Training1/.gitlab-ci.yml` (no `rules`/schedules); `README.md:769-772` lists drift
detection and rollback as *future* enhancements

**Status:** ❌ Missing

**Recommendation.** Add a scheduled drift job (`terraform plan -detailed-exitcode`) that alerts on a
non-zero exit, and store plan artifacts long enough to re-apply a known-good revision.

---

## 4. Networking & Architecture

### Q21. What is the topology and the traffic path to the internet?

**Answer.** A classic **hub-and-spoke** using AWS Transit Gateway:

- **Perimeter VPC (hub)** `100.125.100.0/24` with four subnets: ingress `100.125.100.0/27` (IGW),
  egress `100.125.100.32/27` (NAT GW), inspection `100.125.100.64/27` (reserved), TGW-attachment
  `100.125.100.240/28`.
- **DevOps VPC (spoke)** `100.126.100.0/24` with the workload subnet `100.126.100.0/27` and
  TGW-attachment `100.126.100.240/28`.

Internet egress: `DevOps EC2 → devops RT (0.0.0.0/0 → TGW) → TGW → Perimeter egress subnet
(0.0.0.0/0 → NAT GW) → IGW → Internet`. The DevOps subnet's route table sends the default route to the
Transit Gateway, and the egress subnet sends its default route to the NAT Gateway.

**Evidence:** `Training1/Perimeter/network.tf:1-33`, `Training1/DevOps/network.tf:1-19`,
`Training1/DevOps/routing.tf:1-12`, `Training1/Perimeter/routing.tf:1-12`, `README.md:12-60`

**Status:** ✅ Implemented

**Recommendation.** Add TGW route-table segmentation (separate TGW route tables for
spoke→internet vs. spoke→spoke) to prevent lateral movement, and use the currently empty inspection
subnet for an actual inspection appliance (Q26).

---

### Q22. How is management access to the workload performed?

**Answer.** Via **AWS Systems Manager Session Manager** over a private `ssm` Interface VPC Endpoint
with `private_dns_enabled = true`, backed by an IAM role (`ec2_ssm_role`) carrying
`AmazonSSMManagedInstanceCore` and an instance profile. No key pair, no public IP, and no bastion host
exist — so administration traffic never leaves the AWS network.

**Evidence:** `Training1/DevOps/compute.tf:1-30,76-86`, `README.md:49-53`

**Status:** ✅ Implemented (strong pattern)

**Recommendation.** Add matching `ssmmessages` and `ec2messages` interface endpoints — Session Manager
requires all three services; relying only on `ssm` typically causes session failures when the instance
cannot otherwise reach those endpoints.

---

### Q23. Is the workload instance actually private and least-privilege?

**Answer.** Mostly, with two notable exceptions:

1. **No explicit security group** — `aws_instance.devops_instance` sets `ami`, `instance_type`,
   `subnet_id`, and `iam_instance_profile` but **no `vpc_security_group_ids`**, so the instance falls
   back to the VPC **default** security group rather than a purpose-built one. A dedicated, deny-by-default
   SG is defined only for the SSM *endpoint* (`ssm-endpoint-sg`), not for the instance.
2. **IMDSv1 not disabled** — there is no `metadata_options { http_tokens = "required" }`, so the
   instance metadata service still allows IMDSv1 (a common SSRF credential-theft vector).

Things done right: no public IP, no key pair/`user_data` secrets, IAM role instead of baked credentials.

**Evidence:** `Training1/DevOps/compute.tf:44-53` (instance), `Training1/DevOps/compute.tf:56-74`
(endpoint SG only)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Attach a dedicated least-privilege SG to the instance (no ingress; egress limited to
`ssm`/`ssmmessages`/`ec2messages`/HTTPS) and set `metadata_options { http_tokens = "required" }`.

---
### Q24. What do the Network ACLs and route tables actually allow?

**Answer.** Every subnet gets its own NACL and route table from the `subnet` module, which is good
structure. However the NACL is effectively **wide open** — a single ingress rule (`rule_no = 100`) and a
single egress rule (`rule_no = 200`), both `protocol = "-1"` with `cidr_block = "0.0.0.0/0"` and
`action = "allow"`. All subnet-level filtering therefore depends entirely on security groups, and any
SG misconfiguration (e.g. the default-SG fallback in Q23) is unprotected.

**Evidence:** `Training1/modules/nacl/main.tf:1-25`, `Training1/modules/subnet/main.tf:10-22`,
`README.md:110` (the README itself documents this: "Allows all inbound/outbound traffic (default rules)")

**Status:** ⚠️ Partial / Risk

**Recommendation.** Parameterize NACL rules per subnet (default-deny with explicit allows for
`100.125.100.0/24`/`100.126.100.0/24` and ephemeral ports), so NACLs act as a real second layer of
defence-in-depth rather than a formality.

---

## 5. Security & Access Management

### Q25. Is there any secret or `.tfvars` leakage risk in the repo?

**Answer.** Low. `.gitignore` excludes `node_modules/`, `*.log`, `**/.terraform/`, all `*.tfstate`/
`*.tfstate.*`, `*.tfvars`/`*.tfvars.json`, `override.tf` and `terraform.rc`. No `.env`, no committed
credentials, and the AWS keys are injected from CI variables only. The residual risk is the missing
remote state (Q8) and the CI keys themselves (Q19), not the repository contents.

**Evidence:** `.gitignore:1-19`, `Training1/.gitlab-ci.yml:16-19`

**Status:** ✅ Implemented

**Recommendation.** Add a secret-scanning job (`gitleaks`/GitLab Secret Detection) as a
belt-and-braces control, since `.gitignore` is bypassable with `git add -f`.

---

### Q26. Is traffic inspection / network security enforced?

**Answer.** Not yet. An `inspection` subnet (`100.125.100.64/27`) is created and reserved, and the
README describes it as intended for "traffic inspection/firewall", but **no inspection appliance
exists**: there is no `aws_networkfirewall_*` resource, no AWS Network Firewall endpoint, no firewall
policies, and no route forcing spoke traffic through the inspection subnet. Traffic currently flows
spoke → TGW → NAT GW → internet with no deep-packet inspection.

**Evidence:** `Training1/Perimeter/network.tf:21-26` (subnet only, no appliance);
`README.md:16,754` (listed as a future enhancement)

**Status:** ❌ Missing (architecture is pre-wired but unimplemented)

**Recommendation.** Deploy AWS Network Firewall into the inspection subnet, add VPC endpoints for the
firewall, and re-point the egress route table through the firewall endpoint so east-west and egress
traffic are inspected.

---

### Q27. Are audit, flow, and threat-detection controls enabled?

**Answer.** No. There are no `aws_flow_log` resources, no CloudTrail/VPC logging configuration, no
GuardDuty or AWS Config resources, and no CloudWatch log groups. There is therefore no record of
accepted/rejected traffic, no API-change audit trail owned by this repo, and no anomaly detection.

**Evidence:** no such resources anywhere under `Training1/`; explicitly deferred in `README.md:754-758`

**Status:** ❌ Missing

**Recommendation.** Start with VPC Flow Logs to CloudWatch Logs for both VPCs and enable CloudTrail
(management events) plus GuardDuty — the cheapest way to gain an auditable baseline.

---

### Q28. Is data-at-rest and in-transit encryption configured?

**Answer.** No explicit encryption configuration. The EC2 root EBS volume uses account/AMI defaults
(there is no `root_block_device { encrypted = true }`), there is no KMS key resource, and no
TLS-enforcement policy is defined beyond the SSM endpoint's HTTPS SG rule. Encryption is therefore
left to account-level defaults rather than being declared in code.

**Evidence:** `Training1/DevOps/compute.tf:44-53` (no `root_block_device`/`ebs_block_device` block);
`Training1/DevOps/compute.tf:61-66` (HTTPS only for the endpoint SG)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Set EBS encryption-at-rest explicitly (or enforce via account-level EBS encryption
by default), and adopt a customer-managed KMS key where compliance requires key ownership.

---

### Q29. Are IAM permissions scoped to least privilege?

**Answer.** At the *principal* level yes in spirit (a role, not keys, and no `AdministratorAccess`), but
the instance role attaches the broad AWS-managed `AmazonSSMManagedInstanceCore` policy with no
additional restriction (e.g. no `ssm:SessionDocumentAccessCheck`, no resource-scoped inline policy).
Additionally, `ec2_ssm_role` and `ec2_ssm_profile` use **fixed, non-prefixed names**, so the same
Terraform cannot be applied twice in one account/region without a name clash — an environment-isolation
constraint.

**Evidence:** `Training1/DevOps/compute.tf:2-30`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a `name_prefix`/environment prefix to role and profile names, and append a
tightly-scoped inline policy only where an additional permission is genuinely needed.

---

### Q30. Is there a policy-as-code / guardrail layer?

**Answer.** No. Nothing prevents a future commit from introducing `0.0.0.0/0` on port 22, an unencrypted
volume, an untagged resource, or a public IP — `terraform validate` checks syntax and provider
schema only, not policy. The topic is raised as a *future* enhancement in the repo's own docs.

**Evidence:** `README.md:771`; `SRE_Interview_QA.md` Q28 (describes OPA/Sentinel as not yet implemented)

**Status:** ❌ Missing

**Recommendation.** Add `checkov`/`trivy config` (or OPA/Conftest) to the `lint` stage with rules such
as: no public IPs on private instances, all resources tagged, NACLs must not be `0.0.0.0/0` in prod, EBS
encryption required, no `0.0.0.0/0` on port 22.

---
## 6. Observability & Monitoring

### Q31. What metrics, logs, and alarms exist?

**Answer.** None in code. There are no `aws_cloudwatch_metric_alarm`, `aws_cloudwatch_log_group`,
`aws_sns_topic`, or dashboard resources; EC2 detailed monitoring is not enabled; and NAT Gateway/TGW
metrics are not collected. The only "monitoring" available today is whatever the AWS console shows by
default.

**Evidence:** no CloudWatch/SNS resources under `Training1/`; `README.md:757-758,774-779` lists
monitoring/logging as future work

**Status:** ❌ Missing

**Recommendation.** Add baseline alarms on NAT Gateway `ErrorPortAllocation`/`ActiveConnectionCount`,
EC2 `StatusCheckFailed`, and TGW attachment state, routed to an SNS topic — these catch the failure
modes this topology actually has.

---

### Q32. Can you trace a request end-to-end?

**Answer.** No. There is no X-Ray, no distributed tracing, no application-level logging configuration,
and no centralized log aggregation. The SSM endpoint gives access and VPC Flow Logs would give
network-level evidence, but neither is enabled (Q27).

**Evidence:** no tracing/log resource in the repo; `README.md:776` lists X-Ray as future work

**Status:** ❌ Missing

**Recommendation.** Enable VPC Flow Logs first (network truth), then standardize instance logging to
CloudWatch via the SSM/CloudWatch agent.

---

### Q33. Are there health checks or runbooks?

**Answer.** No health checks and no runbooks in the repo. The nearest thing is the README's "Contact
and Support" section, which points at CloudWatch logs and AWS support rather than a documented
procedure. The SRE doc describes runbooks as an aspiration, not an artifact.

**Evidence:** `README.md:802-812`; `SRE_Interview_QA.md` Q25 step 5 ("Runbooks — *document* step-by-step
recovery procedures")

**Status:** ❌ Missing

**Recommendation.** Add a `docs/runbooks/` directory covering "SSM session will not connect", "spoke has
no internet egress", and "TGW attachment down", each with the exact diagnostic commands.

---
## 7. Reliability & Disaster Recovery

### Q34. Is the architecture highly available?

**Answer.** No — it is single-AZ by design. Every subnet is created without an `availability_zone`
argument, there is exactly **one** NAT Gateway and one Elastic IP, and one EC2 instance in one subnet.
The NAT Gateway is therefore a **single point of failure for internet egress across all spokes**, and
the workload instance is a single point of failure for the workload itself.

**Evidence:** `Training1/modules/subnet/main.tf:1-8` (no AZ argument),
`Training1/Perimeter/gateways.tf:11-28` (one EIP, one NAT GW),
`Training1/DevOps/compute.tf:44-53` (one instance)

**Status:** ⚠️ Partial / Risk (acceptable for a training environment, not for production)

**Recommendation.** For production: one NAT Gateway per AZ with per-AZ route tables, spread the workload
across ≥ 2 AZs behind an ALB/ASG, and consider TGW appliance-mode AZs for the attachment subnets.

---

### Q35. Is there a backup and restore strategy?

**Answer.** No. There are no EBS snapshots, no AWS Backup plans/vaults, and no AMI build pipeline.
Recovery today means re-applying Terraform and recreating the instance from the AMI lookup.

**Evidence:** no `aws_ebs_snapshot`, `aws_backup_*`, or owned `aws_ami` resource (only the
`data "aws_ami"` lookup in `Training1/DevOps/compute.tf:33-41`)

**Status:** ❌ Missing

**Recommendation.** If the workload gains persistent data, add AWS Backup with a documented RPO/RTO;
otherwise document explicitly that the instance is *cattle* and fully reproducible from code.

---

### Q36. What is the RPO/RTO, and is it tested?

**Answer.** Undefined and untested. No RPO/RTO target is stated anywhere, no recovery drill is scheduled,
and no restore procedure is documented. Without remote state (Q8), even "re-apply from scratch" is
unreliable because the applied configuration cannot be reconstructed from CI alone.

**Evidence:** `README.md` (no RPO/RTO section); `SRE_Interview_QA.md` Q25 lists regular drills as a
*recommendation*, not an existing practice

**Status:** ❌ Missing

**Recommendation.** Define RPO/RTO targets, then run a quarterly rebuild exercise in a scratch account to
prove a clean `apply` from empty state reproduces the environment.

---

### Q37. Are compute images kept current?

**Answer.** Partly. The AMI is resolved dynamically (`data "aws_ami" "amazon_linux_2"`,
`most_recent = true`, owner `amazon`, filter `amzn2-ami-hvm-*-x86_64-gp2`), so *new* launches get a recent
AMI — but existing instances are **never patched**, and there is no SSM Patch Manager baseline or
maintenance window. Also note **Amazon Linux 2 reaches end of life in June 2026**, so this filter will
need to move to AL2023.

**Evidence:** `Training1/DevOps/compute.tf:32-41`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Plan the AL2 → AL2023 migration and add an SSM Patch Manager baseline with a
maintenance window — the SSM role and endpoint already exist, so this is low-effort.

---

## 8. Cost Management

### Q38. What are the main cost drivers, and is cost visible?

**Answer.** The main drivers are the NAT Gateway (hourly + per-GB processing), Transit Gateway
attachments (per-attachment-hour + per-GB), the TGW itself, the Elastic IP, and the single `t2.micro`
instance. There is **no cost visibility in the pipeline**: no Infracost, no AWS Budgets, no Cost Anomaly
Detection, and no `Environment`/`CostCenter` tags to allocate spend (see Q11).

**Evidence:** `Training1/Perimeter/gateways.tf:11-28`, `Training1/Perimeter/tgw.tf:1-18`,
`Training1/DevOps/compute.tf:44-53`; `SRE_Interview_QA.md` Q24 mentions only a manual estimate (~$45/mo)

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add Infracost to the plan stage for per-MR cost deltas, set an AWS Budget alarm, and
apply the standard tag set so spend is attributable.

---

### Q39. Are cost-optimization levers identified?

**Answer.** Yes, informally. `SRE_Interview_QA.md` Q24 discusses the NAT-instance alternative (~$45/month
variant) and EC2 scheduling, and the README frames the shared NAT Gateway as a cost-sharing benefit of
the hub-and-spoke design. None of these levers are implemented or tracked.

**Evidence:** `README.md:11` (shared NAT "reduces cost"), `SRE_Interview_QA.md` Q24

**Status:** ⚠️ Partial / Risk

**Recommendation.** Implement the cheap wins first — EC2 instance scheduling for non-prod (SSM
maintenance window or EventBridge + Lambda) and a Graviton instance type (`t4g.micro`) where compatible.

---
## 9. Developer Experience, Tooling & Documentation

### Q40. Can a new engineer run this locally in a predictable way?

**Answer.** Not without tribal knowledge. There is no `Makefile`, `Taskfile`, `CONTRIBUTING.md`, or
`docs/getting-started`. Prerequisites (`AWS CLI` credentials, `terraform`, Node for the renderer) are
implied rather than declared, and `terraform init` cannot run offline for validation without knowing the
`-backend=false` trick that CI happens to use.

**Evidence:** repository file inventory (no Makefile/CONTRIBUTING/Taskfile); `.gitlab-ci.yml:28` uses
`terraform init -backend=false` without documenting it

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a `Makefile` (or `Taskfile.yml`) with `fmt`, `lint`, `validate`, `plan`,
`diagram` targets plus a short `CONTRIBUTING.md`.

---

### Q41. Is the Terraform provider lock file committed?

**Answer.** No — `.gitignore:7` excludes `**/.terraform.lock.hcl`. This means provider versions are
re-resolved on every machine/run within the `~> 5.0` range, so two runs can select different patch
versions. This is the opposite of the HashiCorp recommendation (commit the lock file for root modules)
and it is also what makes Q17's caching impossible.

**Evidence:** `.gitignore:7`, `Training1/Perimeter/providers.tf:3-6`, `Training1/DevOps/providers.tf:3-6`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Remove `**/.terraform.lock.hcl` from `.gitignore`, commit the lock files, and use
`terraform providers lock -platform=linux_amd64 -platform=darwin_arm64` for cross-platform determinism.

---

### Q42. How is the architecture diagram produced and kept in sync?

**Answer.** By hand + a Puppeteer script. `aws-architecture-diagram.tsx`/`aws-architecture-diagram.html`
are hand-authored sources; `render-diagram.cjs` launches headless Chromium (`--no-sandbox`), waits for
`#diagram-container svg`, and screenshots the container to `aws-architecture-diagram.png`. A separate
`aws-hub-spoke-architecture.json` + `.deliver.json` pair records a validated "showcase" composition
(`checksPassed: 9`, `compositionStatus: pass`, `verified: true`). Nothing ties the diagram to the
Terraform, so the picture can silently drift from reality; the renderer is also not part of CI.

**Evidence:** `render-diagram.cjs:1-42`, `aws-hub-spoke-architecture.deliver.json:16-29`, `package.json:12-14`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Add a CI job (Node + `puppeteer`) that re-renders the PNG on change, and consider
generating topology from Terraform state (`terraform graph`) so the diagram cannot drift.

---

### Q43. Is the empty `render-diagram.mjs` file a problem?

**Answer.** Yes, as a maintenance trap. `render-diagram.mjs` is committed at **0 bytes**. Anyone
searching for the renderer finds two entry points — the working `.cjs` and the empty `.mjs` — and cannot
tell which is authoritative. `package.json` exposes no script for either, so there is not even a single
documented invocation.

**Evidence:** `render-diagram.mjs` (length 0), `render-diagram.cjs:1-42`, `package.json:6-8`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Delete `render-diagram.mjs` and add a `"diagram": "node render-diagram.cjs"` script to
`package.json`.

---

### Q44. Is the documentation accurate and complete?

**Answer.** Broadly yes and unusually thorough for a training repo — a ~830-line `README.md` covering
architecture, module interfaces, traffic flows, security, and a future-enhancements backlog, plus a
separate `SRE_Interview_QA.md` with 30 grounded Q&As. Two caveats: (1) the README claims "Production
Ready" (`README.md:832`) while the same document elsewhere lists monitoring, drift detection, policy as
code, and rollback as *unimplemented future work* — a documentation-vs-reality gap; and (2) the untracked
files in Q4 mean part of the documentation set is not in version control at all.

**Evidence:** `README.md:816-832`, `README.md:751-779`, `Training1/README.md:1-3`, `SRE_Interview_QA.md:1-286`

**Status:** ⚠️ Partial / Risk

**Recommendation.** Re-label the maturity claim honestly (e.g. "Reference/training architecture, not
production-hardened") and commit the untracked documentation artifacts.

---
## 10. Maturity Scorecard

44 questions asked. Weighting: ✅ = 2 points, ⚠️ = 1 point, ❌ = 0 points (max = 88).

| Domain | Questions | ✅ | ⚠️ | ❌ | Domain score |
| ------ | --------- | - | -- | -- | ------------ |
| 1. Repository & Governance | 4 | 1 | 2 | 1 | 50% |
| 2. Infrastructure as Code | 8 | 1 | 5 | 2 | 44% |
| 3. CI/CD Pipeline | 8 | 1 | 5 | 2 | 44% |
| 4. Networking & Architecture | 4 | 2 | 2 | 0 | 75% |
| 5. Security & Access | 6 | 1 | 3 | 2 | 42% |
| 6. Observability | 3 | 0 | 0 | 3 | 0% |
| 7. Reliability & DR | 4 | 0 | 2 | 2 | 25% |
| 8. Cost Management | 2 | 0 | 2 | 0 | 50% |
| 9. Developer Experience & Docs | 5 | 0 | 4 | 1 | 40% |
| **Total** | **44** | **6** | **25** | **13** | **≈ 42%** |

**Reading of the score.** The **network architecture itself is the strongest part** of the repo
(75%): the hub-and-spoke design, Transit Gateway routing, and the SSM-based access pattern are
well-executed and correctly documented. The **operational scaffolding around it is the weakest**:
observability is at 0%, there is no remote state, no policy enforcement, no test suite, and the CI
pipeline runs the most privileged apply without a human gate. That is a very typical profile for a
reference/training repository — and it means the highest ROI work is *platform hygiene*, not more
network features.

---

## 11. Prioritized Action Plan

Ordered by risk-reduction per unit of effort.

| # | Action | Addresses | Effort | Impact |
| - | ------ | --------- | ------ | ------ |
| 1 | Add S3 remote backend (encrypted) + DynamoDB locking (or `use_lockfile`) to both stacks | Q8, Q9, Q20, Q36 | M | **Critical** |
| 2 | Add `when: manual` + protected environment to `perimeter-network-apply`; explicit `dependencies` on both apply jobs | Q14, Q15 | S | **High** |
| 3 | Add a `lint` stage: `terraform fmt -check -recursive`, `tflint`, `checkov`/`trivy config` | Q7, Q30 | S | **High** |
| 4 | Replace static AWS keys with GitLab OIDC → `sts:AssumeRoleWithWebIdentity`; store no long-lived secrets | Q19, Q25 | M | **High** |
| 5 | Attach a dedicated least-privilege SG to the EC2 instance and disable IMDSv1 (`http_tokens = "required"`) | Q23, Q24 | S | **High** |
| 6 | Pin the Terraform CLI (`required_version`) and the CI image tag; commit `.terraform.lock.hcl` | Q5, Q17, Q41 | S | **Medium-High** |
| 7 | Add VPC Flow Logs + CloudTrail + GuardDuty; baseline CloudWatch alarms to SNS | Q27, Q31, Q32 | M | **Medium-High** |
| 8 | Add `ssmmessages` and `ec2messages` interface endpoints alongside `ssm` | Q22 | S | **Medium** |
| 9 | Consistent `default_tags` (Project/Owner/Environment) + `name_prefix` on IAM role/profile | Q11, Q29, Q38 | S | **Medium** |
| 10 | Parameterize region/CIDRs/instance type into variables with per-env `.tfvars` | Q10, Q34 | M | **Medium** |
| 11 | Add `terraform test`/Terratest for module contracts; a `Makefile` with `fmt/lint/validate/plan/diagram` | Q12, Q40 | M | **Medium** |
| 12 | Delete `render-diagram.mjs`, add a `diagram` npm script, commit the untracked doc artifacts, add `CODEOWNERS` | Q4, Q43, Q1 | S | **Low-Medium** |
| 13 | Deploy AWS Network Firewall in the reserved inspection subnet | Q26 | L | **Medium-High** (design already anticipates it) |
| 14 | Multi-AZ NAT + multi-AZ workload for production; AWS Backup and a documented RPO/RTO with drills | Q34, Q35, Q36 | L | **High** (only if going to prod) |
| 15 | Migrate instances AMI from Amazon Linux 2 → AL2023 (AL2 EOL June 2026) + SSM Patch Manager baseline | Q37 | M | **Medium** |

**Zero-risk, same-day wins:** #3, #5, #6, #8, #9, #12 — none of these require new AWS infrastructure
or a state migration.

---

## 12. Honest Verdict

| Claim in the repo | Assessment |
| ----------------- | ---------- |
| "Production-ready AWS infrastructure … CI/CD automation … AWS best practices" (`README.md:816-832`) | **Overstated.** The *network design* is production-quality; the *operational controls* (state, monitoring, policy, HA, backups) are not. Recommend re-labelling as a reference/training architecture with an explicit hardening backlog. |
| "Security: no public IPs, IAM roles instead of keys, SSM Session Manager, least privilege" | **Mostly true** for the workload access path; **incomplete** — the instance uses the default SG, IMDSv1 is enabled, and NACLs allow all traffic. |
| "CI/CD: automated validation, plan before apply, manual approval for production" | **Partly true.** Validate/plan/apply exists and the plan artifact is reused; but only the *DevOps* apply is manual, and the more privileged *Perimeter* apply auto-approves. |

---

*Generated by reviewing repository revision `599b6` (`master`). Scope is the committed tree plus the
untracked artifacts listed in Q4. No AWS API calls were made; all findings are static-analysis of the
repository.*

*See also: `SRE_Interview_QA.md` (thematic SRE Q&A), `README.md` (architecture documentation).*
