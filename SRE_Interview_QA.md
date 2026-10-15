# SRE Interview Q&A - AWS Multi-VPC Architecture

This document contains common SRE interview questions and answers based on the AWS Multi-VPC Hub-and-Spoke architecture in this repository.

---

## Architecture & Design

### Q1: Explain the hub-and-spoke topology used in this architecture.

**A:** The architecture uses a hub-and-spoke model where the Perimeter VPC (Hub) acts as the central routing and egress point, while the DevOps VPC (Spoke) hosts the workload. All inter-VPC and internet traffic flows through the hub via a Transit Gateway (TGW). This centralizes control, simplifies routing, and reduces cost by sharing the NAT Gateway across multiple spokes.

---

### Q2: Why is the DevOps EC2 instance deployed in a private subnet without a public IP?

**A:** Deploying the EC2 instance in a private subnet without a public IP follows the principle of least exposure. Management access is provided via AWS Systems Manager Session Manager through an SSM VPC Endpoint, keeping all traffic within the AWS network. This eliminates the need for SSH keys, security group rules for port 22, and reduces the attack surface.

---

### Q3: How does the DevOps VM reach the internet?

**A:** The DevOps VM sends HTTPS requests to its default route (0.0.0.0/0), which points to the Transit Gateway. The TGW routes the traffic to the Perimeter VPC's Egress Subnet. The egress subnet's route table directs the traffic to a NAT Gateway, which performs source NAT (SNAT) using its Elastic IP before forwarding to the internet.

---

### Q4: What is the purpose of the Transit Gateway in this architecture?

**A:** The Transit Gateway acts as a central routing hub connecting the Perimeter and DevOps VPCs. It enables private communication between VPCs without internet exposure. The DevOps VPC routes all default traffic (0.0.0.0/0) to the TGW, which then forwards appropriate traffic to the Perimeter VPC's NAT Gateway for internet access.

---

### Q5: Why use a NAT Gateway instead of a NAT instance?

**A:** A NAT Gateway is a managed AWS service that provides high availability and automatic scaling without requiring patching, monitoring, or replacement. While a NAT instance is cheaper, it requires more operational overhead and does not scale automatically. For production workloads, NAT Gateway is preferred for its reliability and serverless nature.

---

## Terraform & IaC

### Q6: How is Terraform state managed between the Perimeter and DevOps stacks?

**A:** The DevOps stack uses a `terraform_remote_state` data source to read outputs from the Perimeter stack. Currently configured with a local backend pointing to `../Perimeter/terraform.tfstate.backup`, it consumes `tgw_id` and `perimeter_vpc_cidr` without manual variable passing. In production, this should use an S3 backend with DynamoDB for locking.

---

### Q7: Explain the nested module structure in the subnet module.

**A:** The `subnet` module calls two nested modules: `rt` (route table) and `nacl` (network ACL). This encapsulates subnet creation with its associated route table and NACL, ensuring every subnet automatically gets its own route table and NACL upon creation. This enforces the network layer best practice of one route table and one NACL per subnet.

---

### Q8: What are the benefits of using Terraform modules in this project?

**A:** Modules provide reusability (DRY principle), consistency across environments, easier maintenance (changes propagate to all usages), and abstraction (users don't need to understand every resource detail). The `vpc`, `subnet`, `rt`, and `nacl` modules allow the Perimeter and DevOps environments to define infrastructure declaratively without repeating resource configurations.

---

### Q9: What is the current state backend configuration and what are the risks?

**A:** The state is stored locally in `terraform.tfstate` files. The DevOps stack reads Perimeter state via a local file path. In a CI/CD environment with GitLab runners, local state is not persistent and does not support locking, which can cause corruption or concurrent apply conflicts. Production should use S3 backend with DynamoDB for state locking.

---

### Q10: How does the GitLab CI/CD pipeline handle the dependency between Perimeter and DevOps deployments?

**A:** The pipeline is structured in 6 stages with explicit ordering. Perimeter applies first and exports outputs (TGW ID, VPC CIDR) as environment variables via a dotenv artifact. The DevOps plan stage then reads these outputs through remote state. This ensures DevOps cannot be deployed until Perimeter is successfully provisioned.

---

## Security

### Q11: How does SSM Session Manager replace traditional SSH access?

**A:** SSM Session Manager uses the SSM Agent running on the EC2 instance and an IAM role (`AmazonSSMManagedInstanceCore`) instead of SSH keys. The engineer connects via the AWS CLI or Console, and the SSM VPC Endpoint (Interface type) keeps traffic within the AWS private network. This eliminates the need for inbound SSH port 22 rules, bastion hosts, or key management.

---

### Q12: What IAM permissions does the DevOps EC2 instance have?

**A:** The EC2 instance is assigned an IAM role (`ec2_ssm_role`) with the AWS managed policy `AmazonSSMManagedInstanceCore`. This grants permissions specifically for SSM operations (session management, inventory, patch management). The instance does not have long-term credentials; it uses temporary STS credentials via the instance metadata service.

---

### Q13: What security improvements should be made to the NACL rules for production?

**A:** Currently, NACLs allow all inbound/outbound traffic (0.0.0.0/0). For production, restrict NACL rules to specific ports and protocols:
- Ingress: Allow only necessary ports (e.g., 443 for HTTPS, ephemeral ports for return traffic)
- Egress: Allow only required CIDR ranges and ports
- Implement stateless rules with explicit allow/deny entries
- Add specific deny rules for known bad actors if applicable

---

### Q14: How does the architecture implement defense in depth?

**A:** Multiple security layers are implemented:
1. **Network Isolation**: Separate VPCs, private subnets, TGW routing
2. **Subnet-Level Security**: Individual NACLs per subnet
3. **Instance-Level Security**: Security groups on SSM endpoint
4. **IAM**: Least privilege roles, no long-term credentials on EC2
5. **Private Endpoints**: SSM VPC Endpoint keeps AWS API traffic private
6. **No Public IPs**: Workloads are not directly internet-accessible

---

### Q15: What is the security benefit of routing all internet traffic through the Perimeter VPC?

**A:** Centralized egress through the Perimeter VPC provides:
- Single point for traffic inspection and logging (future Network Firewall placement)
- Consistent security policy enforcement
- Simplified monitoring and audit trails
- Cost optimization by sharing NAT Gateway across spokes
- Ability to implement outbound proxy or content filtering at one location

---

## GitLab CI/CD

### Q16: Why is the `devops-network-apply` stage configured with `when: manual`?

**A:** The manual trigger ensures human approval before applying changes to the DevOps environment. This acts as a control gate for production deployments, allowing team members to review the execution plan and verify changes before they take effect. It prevents automatic application of potentially breaking changes from merged code.

---

### Q17: What does `terraform init -backend=false` do in the validate stage?

**A:** This initializes Terraform without configuring the backend. It downloads providers and modules but skips state backend configuration. This is appropriate for the validate stage because we only need to check syntax and configuration validity without needing access to state. Using `-backend=false` also speeds up validation and avoids requiring state access credentials.

---

### Q18: How are Terraform plans preserved between pipeline stages?

**A:** The `terraform plan -out=plan.tfplan` command in the plan stage saves the execution plan to a file, which is then passed as a pipeline artifact to the apply stage. The apply stage uses `terraform apply -auto-approve plan.tfplan` to ensure only the pre-reviewed changes are applied, preventing drift between planned and applied infrastructure.

---

## Troubleshooting

### Q19: If a DevOps EC2 instance cannot reach the internet, what would you check?

**A:**
1. Verify DevOps subnet route table has 0.0.0.0/0 pointing to TGW
2. Check TGW attachment status for both Perimeter and DevOps VPCs
3. Verify NAT Gateway is in available state with an Elastic IP
4. Confirm Egress subnet route table has 0.0.0.0/0 pointing to NAT Gateway
5. Check security groups and NACLs on all subnets involved
6. Verify IGW is attached to the Perimeter VPC

---

### Q20: If SSM Session Manager fails to connect, what are the likely causes?

**A:**
1. IAM role not attached to EC2 instance or missing `AmazonSSMManagedInstanceCore` policy
2. SSM Agent not running or outdated on the instance
3. SSM VPC Endpoint not created or misconfigured in the DevOps VPC
4. Security group on SSM endpoint not allowing inbound 443 from VPC CIDR
5. Instance is not in a state supported by SSM (e.g., pending, stopping)
6. Region mismatch between SSM service and instance

---

### Q21: How would you debug Terraform state lock issues in GitLab CI?

**A:**
1. Check if a previous pipeline failed and left a lock in DynamoDB
2. Use AWS CLI to inspect the lock table: `aws dynamodb get-item --table-name terraform-locks`
3. Identify the lock ID from the error message
4. If stale, use `terraform force-unlock <lock-id>` from a secure environment
5. Review pipeline logs to ensure no concurrent pipelines are running
6. Consider adding pipeline job concurrency limits to prevent parallel applies

---

## Operational Excellence

### Q22: What monitoring and observability improvements would you add?

**A:**
1. **CloudWatch Alarms**: CPU, memory, and network metrics on EC2 instances
2. **VPC Flow Logs**: Capture network traffic metadata for security analysis
3. **NAT Gateway Metrics**: Monitor bytes processed and connection counts
4. **TGW Metrics**: Track inter-VPC traffic patterns
5. **SNS Alerts**: Notify on pipeline failures, high NAT costs, or security group changes
6. **CloudWatch Dashboards**: Centralized view of infrastructure health
7. **AWS GuardDuty**: Threat detection across the account

---

### Q23: How would you implement cost optimization for this architecture?

**A:**
1. **EC2 Scheduling**: Stop/start the DevOps instance on a schedule for dev environments
2. **NAT Gateway**: Use a NAT instance for dev/test to reduce cost from ~$32 to ~$5/month
3. **TGW**: Consider per-attachment pricing model if cross-VPC traffic is low
4. **SSM VPC Endpoint**: Only needed in production; remove for dev
5. **Instance Right-sizing**: Use t3.micro instead of t2.micro for burstable workloads
6. **Data Transfer**: Monitor and optimize cross-AZ or inter-VPC data transfer

---

### Q24: What is the estimated monthly cost and how would you present it to stakeholders?

**A:** Approximately $120-150/month for the current setup. Breakdown:
- NAT Gateway: ~$32/month + data transfer
- Transit Gateway: ~$36/month + data transfer
- EC2 t2.micro: ~$8.50/month
- SSM VPC Endpoint: ~$7/month
- TGW Attachments: ~$36/month

Present this as a baseline with cost optimization levers (e.g., $45/month with NAT instance and EC2 scheduling). Emphasize the trade-offs between cost and operational overhead for each component.

---

### Q25: How would you handle disaster recovery for this infrastructure?

**A:**
1. **State File Backup**: Ensure Terraform state in S3 has versioning and cross-region replication
2. **Multi-Region Deployment**: Deploy a secondary stack in another region for critical workloads
3. **Route 53 Health Checks**: Fail over to a secondary region if needed
4. **Backup Policies**: Implement automated snapshots for any RDS or EBS resources
5. **Runbooks**: Document step-by-step recovery procedures for each component
6. **Regular Drills**: Test recovery procedures quarterly

---

## Advanced Topics

### Q26: How would you extend this architecture to support additional spoke VPCs?

**A:**
1. Create a new spoke VPC directory following the DevOps structure
2. Reuse existing `vpc`, `subnet`, `rt`, and `nacl` modules
3. Attach the new VPC to the existing Transit Gateway
4. Update the GitLab pipeline to include the new spoke stages
5. Configure appropriate route tables to route internet traffic through the Perimeter VPC
6. Ensure the spoke VPC reads Perimeter outputs via remote state for TGW ID

---

### Q27: What is the difference between a Transit Gateway Attachment and a VPC Peering connection?

**A:** TGW Attachment connects a VPC to a Transit Gateway hub, enabling transitive routing between multiple VPCs through a single hub. VPC Peering creates a direct 1-to-1 connection between two VPCs, but does not support transitive routing (if VPC A peers with B and C, B and C cannot communicate through A). TGW is preferred for hub-and-spoke topologies with 3+ VPCs.

---

### Q28: How would you implement policy as code (PaC) in this pipeline?

**A:**
1. Add a `policy-check` stage using OPA (Open Policy Agent) or HashiCorp Sentinel
2. Define policies such as:
   - No public IPs on private instances
   - Required tags on all resources
   - NACL must not allow 0.0.0.0/0 (for production)
   - Encryption at rest for all storage resources
   - No security groups allowing 0.0.0.0/0 on port 22
3. Run policy checks in the validate stages before plan
4. Fail the pipeline if any policy violations are detected

---

### Q29: What is drift detection and how would you implement it?

**A:** Drift detection identifies differences between the actual infrastructure state and the Terraform configuration. Implement by:
1. Adding a scheduled pipeline that runs `terraform plan` against live state
2. Comparing the plan output to a baseline
3. Alerting via SNS if any resources have drifted from configuration
4. Optionally creating a drift report artifact for review
5. Setting a policy that requires manual review and plan approval if drift is detected

---

### Q30: How would you secure the GitLab CI/CD pipeline credentials?

**A:**
1. Store `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitLab protected/masked variables
2. Use IAM roles for Service Accounts (IRSA) if running on AWS, or OIDC federation to avoid long-term credentials
3. Scope IAM permissions to only what Terraform needs (principle of least privilege)
4. Rotate credentials regularly using GitLab's secret rotation features
5. Audit pipeline access logs and restrict pipeline triggers to specific branches
6. Enable GitLab's security scanning (SAST, DAST, dependency scanning)

---

*Last Updated: Based on Repository Version 1.0 - November 2025*
