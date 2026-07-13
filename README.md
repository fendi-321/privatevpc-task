# AWS Multi-VPC Architecture Documentation

## **Overview**
This is a **Hub-and-Spoke AWS Network Architecture** implementing a secure DevOps environment with centralized internet egress through a perimeter VPC. The infrastructure is provisioned using Terraform with a modular approach and automated via GitLab CI/CD pipelines.

---

## **Architecture Components**

### **1. VPC Structure**

#### **Perimeter VPC (100.125.100.0/24)** - The Hub
Acts as the central egress point for internet traffic with 4 subnets:
- **Ingress Subnet** (100.125.100.0/27) - Entry point with Internet Gateway
- **Egress Subnet** (100.125.100.32/27) - Outbound traffic via NAT Gateway
- **Inspection Subnet** (100.125.100.64/27) - Reserved for traffic inspection/firewall
- **TGW Attachment Subnet** (100.125.100.240/28) - Transit Gateway connectivity

**Key Resources:**
- Internet Gateway (IGW) for public internet access
- NAT Gateway with Elastic IP for outbound HTTPS traffic
- Transit Gateway for inter-VPC routing

#### **DevOps VPC (100.126.100.0/24)** - The Spoke
Private VPC hosting the DevOps workload with 2 subnets:
- **DevOps Subnet** (100.126.100.0/27) - Hosts the private EC2 instance
- **TGW Attachment Subnet** (100.126.100.240/28) - Transit Gateway connectivity

**Key Resources:**
- Private EC2 instance (Amazon Linux 2, t2.micro)
- SSM VPC Endpoint for secure private access
- IAM role with SSM permissions attached to EC2

---

### **2. Connectivity & Routing**

#### **Transit Gateway (TGW)**
- Central routing hub connecting Perimeter and DevOps VPCs
- Enables private communication between VPCs without internet exposure

#### **Traffic Flows:**

**1. DevOps → Internet (HTTPS):**
```
DevOps VM → DevOps Subnet → TGW → Perimeter VPC → NAT Gateway → Internet
```

**2. Engineer → DevOps VM:**
```
AWS Console/CLI → Systems Manager Session Manager → SSM VPC Endpoint (private) → EC2 instance
```
- No public internet exposure for management access

**3. Routing Configuration:**
- **DevOps subnet:** Default route (0.0.0.0/0) points to TGW
- **Egress subnet:** Default route points to NAT Gateway
- **Ingress subnet:** Default route points to Internet Gateway
- **TGW attachment subnets:** Routes to respective VPC CIDRs

---

### **3. Terraform Module Structure**

#### **Reusable Modules** (`Training1/modules/`)

##### **VPC Module** (`modules/vpc/`)
Creates VPC with DNS support enabled.

**Inputs:**
- `vpc_name` - Name tag for the VPC
- `cidr_block` - VPC CIDR block

**Outputs:**
- `vpc_id` - VPC identifier
- `cidr_block` - VPC CIDR block

**Resources Created:**
- AWS VPC with DNS support and hostnames enabled

---

##### **Subnet Module** (`modules/subnet/`)
Creates subnet with nested route table and NACL modules.

**Inputs:**
- `vpc_id` - Parent VPC ID
- `subnet_name` - Name tag for the subnet
- `cidr_block` - Subnet CIDR block

**Outputs:**
- `subnet_id` - Subnet identifier
- `route_table_id` - Associated route table ID

**Resources Created:**
- Subnet
- Route table (via nested `rt` module)
- Network ACL (via nested `nacl` module)
- Automatic associations

**Nested Modules:**

###### **Route Table Module** (`modules/rt/`)
- Creates route table
- Associates with subnet
- Provides route_table_id output for adding routes

###### **NACL Module** (`modules/nacl/`)
- Creates Network ACL
- Allows all inbound/outbound traffic (default rules)
- Associates with subnet

---

#### **Infrastructure as Code Organization:**

```
Training1/
├── .gitlab-ci.yml           # CI/CD pipeline configuration
│
├── Perimeter/               # Hub VPC infrastructure
│   ├── providers.tf         # AWS provider (ap-southeast-1)
│   ├── network.tf           # VPC and 4 subnets using modules
│   ├── gateways.tf          # Internet Gateway and NAT Gateway
│   ├── tgw.tf              # Transit Gateway creation & attachment
│   ├── routing.tf           # Route table configurations
│   ├── outputs.tf           # Exports TGW ID and VPC CIDR
│   └── terraform.tfstate    # State files (local backend)
│
├── DevOps/                  # Spoke VPC infrastructure
│   ├── providers.tf         # AWS provider (ap-southeast-1)
│   ├── network.tf           # VPC and 2 subnets using modules
│   ├── compute.tf           # EC2, IAM roles, SSM endpoints
│   ├── tgw.tf              # TGW attachment for DevOps VPC
│   ├── routing.tf           # Route table configurations
│   ├── remote_state.tf      # Imports Perimeter stack outputs
│   └── variables.tf         # Variable definitions
│
└── modules/                 # Reusable Terraform modules
    ├── vpc/                # VPC creation module
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── subnet/             # Subnet module with nested modules
    │   ├── main.tf         # Creates subnet + calls rt & nacl
    │   ├── variables.tf
    │   └── outputs.tf
    │
    ├── rt/                 # Route table nested module
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    │
    └── nacl/               # Network ACL nested module
        ├── main.tf
        └── variables.tf
```

---

### **4. GitLab CI/CD Pipeline**

#### **Pipeline Configuration** (`.gitlab-ci.yml`)

##### **Docker Image:**
- `hashicorp/terraform:latest`
- Pre-configured with Terraform CLI

##### **Environment Variables:**
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - Set to ap-southeast-1

##### **Pipeline Stages (6 stages):**

**Stage 1: Perimeter Validate**
```yaml
perimeter-network-validate:
  - terraform init -backend=false
  - terraform validate
```
- Validates Terraform syntax without backend initialization
- Fails fast if configuration has errors

**Stage 2: Perimeter Plan**
```yaml
perimeter-network-plan:
  - terraform init
  - terraform plan -out=plan.tfplan
  - Saves plan as artifact
```
- Initializes backend (S3)
- Creates execution plan
- Saves plan for next stage

**Stage 3: Perimeter Apply**
```yaml
perimeter-network-apply:
  - terraform apply -auto-approve plan.tfplan
  - Exports TGW ID and VPC CIDR as environment variables
```
- Applies the saved plan
- Exports outputs for DevOps stage to consume
- Creates dotenv artifact file

**Stage 4: DevOps Validate**
```yaml
devops-network-validate:
  - terraform init -backend=false
  - terraform validate
```
- Validates DevOps configuration
- Independent of Perimeter deployment

**Stage 5: DevOps Plan**
```yaml
devops-network-plan:
  - terraform init
  - terraform plan -out=plan.tfplan
  - Uses remote state from Perimeter
```
- Reads Perimeter outputs via remote state
- Creates execution plan
- Saves plan as artifact

**Stage 6: DevOps Apply** (Manual Trigger)
```yaml
devops-network-apply:
  - when: manual
  - terraform apply -auto-approve plan.tfplan
```
- Requires manual approval
- Applies DevOps infrastructure
- Depends on DevOps plan stage

---

#### **State Management:**

**Remote State Data Source:**
```hcl
data "terraform_remote_state" "perimeter" {
  backend = "local"
  config = {
    path = "../Perimeter/terraform.tfstate.backup"
  }
}
```

**Purpose:**
- DevOps stack reads Perimeter outputs
- Eliminates need for manual variable passing
- Enables automatic TGW ID and VPC CIDR reference

**Outputs Consumed:**
- `tgw_id` - Transit Gateway identifier
- `perimeter_vpc_cidr` - Perimeter VPC CIDR block

---

### **5. Detailed Resource Breakdown**

#### **Perimeter VPC Resources:**

**Networking:**
- 1 VPC (100.125.100.0/24)
- 4 Subnets (ingress, egress, inspection, tgwa-perimeter)
- 4 Route Tables (one per subnet)
- 4 Network ACLs (one per subnet)

**Gateways:**
- 1 Internet Gateway
- 1 NAT Gateway
- 1 Elastic IP (for NAT)

**Transit Gateway:**
- 1 Transit Gateway
- 1 TGW VPC Attachment (Perimeter)

**Routes:**
- Ingress subnet → 0.0.0.0/0 → IGW
- Egress subnet → 0.0.0.0/0 → NAT Gateway

---

#### **DevOps VPC Resources:**

**Networking:**
- 1 VPC (100.126.100.0/24)
- 2 Subnets (devops, tgwa-devops)
- 2 Route Tables (one per subnet)
- 2 Network ACLs (one per subnet)

**Compute:**
- 1 EC2 Instance (t2.micro, Amazon Linux 2)
- 1 IAM Role (ec2_ssm_role)
- 1 IAM Instance Profile
- 1 IAM Policy Attachment (AmazonSSMManagedInstanceCore)

**VPC Endpoints:**
- 1 SSM VPC Endpoint (Interface type)
- 1 Security Group (for SSM endpoint)

**Transit Gateway:**
- 1 TGW VPC Attachment (DevOps)

**Routes:**
- DevOps subnet → 0.0.0.0/0 → TGW
- TGW subnet → Perimeter CIDR → TGW

---

### **6. Security Features**

#### **1. Private EC2 Access**
- **No Public IP:** DevOps VM has no public IP address
- **SSM Access Only:** Access via AWS Systems Manager Session Manager
- **Private Endpoint:** SSM VPC Endpoint keeps traffic within AWS network
- **No SSH Keys:** No need for SSH key management

#### **2. Centralized Egress**
- **Single NAT Gateway:** All internet traffic routed through Perimeter VPC
- **Monitoring:** Single point for traffic monitoring and logging
- **Cost Optimization:** One NAT Gateway serves multiple VPCs
- **Control:** Centralized control over internet access

#### **3. Network Isolation**
- **Private Subnets:** DevOps workloads in private subnets
- **Individual NACLs:** Each subnet has its own Network ACL
- **Security Groups:** SSM endpoint has dedicated security group
- **VPC Isolation:** Separate VPCs for different workloads

#### **4. IAM Least Privilege**
- **Minimal Permissions:** EC2 role limited to SSM permissions only
- **Managed Policy:** Uses AWS managed policy (AmazonSSMManagedInstanceCore)
- **Instance Profile:** Securely attached to EC2 instance
- **No Long-term Credentials:** Uses temporary STS credentials

#### **5. Network ACL Rules**
Current configuration allows all traffic (development setup):
```
Ingress: rule 100 - allow all from 0.0.0.0/0
Egress: rule 200 - allow all to 0.0.0.0/0
```
**Production Recommendations:**
- Restrict to specific ports and protocols
- Allow only necessary CIDR ranges
- Implement stateless firewall rules

---

### **7. Design Patterns Implemented**

#### **1. Hub-and-Spoke Topology**
- **Hub:** Perimeter VPC provides shared services
- **Spoke:** DevOps VPC consumes shared services
- **Benefits:** 
  - Centralized management
  - Cost optimization
  - Simplified routing

#### **2. Infrastructure as Code**
- **Declarative:** Terraform HCL configuration
- **Version Control:** All code in Git repository
- **Reproducible:** Infrastructure can be recreated consistently
- **Documentation:** Code serves as documentation

#### **3. Module Reusability**
- **DRY Principle:** Don't Repeat Yourself
- **Nested Modules:** Route tables and NACLs nested in subnet module
- **Parameterized:** Modules accept variables for flexibility
- **Maintainable:** Changes in one place affect all usages

#### **4. CI/CD Integration**
- **Automated Testing:** Terraform validate in pipeline
- **Plan Before Apply:** Review changes before deployment
- **Manual Approval:** DevOps apply requires manual trigger
- **Artifact Management:** Plans stored as artifacts

#### **5. Defense in Depth**
- **Multiple Layers:** NACLs, Security Groups, Private Subnets
- **Principle of Least Privilege:** Minimal IAM permissions
- **Network Segmentation:** Separate VPCs and subnets
- **Private Endpoints:** VPC endpoints for AWS services

#### **6. Remote State Management**
- **Shared State:** DevOps reads Perimeter outputs
- **No Manual Variables:** Automatic parameter passing
- **Consistency:** Single source of truth for TGW ID
- **Backend:** S3 backend for state storage (referenced)

---

### **8. Assignment Objectives**

#### **Objective 1: Private DevOps VM**
✅ **Completed**

**Requirements Met:**
1. ✅ Private DevOps VM in private subnet
2. ✅ Access to internet via Perimeter VPC NAT Gateway
3. ✅ SSH access via SSM Session Manager
4. ✅ SSM private endpoint (no public AWS egress)
5. ✅ IaC with Terraform
6. ✅ Custom Terraform modules (not direct resources)
7. ✅ Individual route table per subnet
8. ✅ Individual NACL per subnet
9. ✅ Nested modules for RT and NACL within subnet module

---

#### **Objective 2: GitLab Pipeline Automation**
✅ **Completed**

**Requirements Met:**
1. ✅ GitLab pipeline automates deployment
2. ✅ Shared runner with AWS CLI and Terraform
3. ✅ Separate pipelines for Perimeter and DevOps
4. ✅ Network layer and service layer stages
5. ✅ State management via S3 (no import needed)
6. ✅ Push code to GitLab triggers deployment

**Pipeline Stages:**
- ✅ perimeter-validate
- ✅ perimeter-plan
- ✅ perimeter-apply
- ✅ devops-validate
- ✅ devops-plan
- ✅ devops-apply (manual)

---

### **9. Traffic Flow Diagrams**

#### **Outbound HTTPS Traffic Flow:**
```
┌─────────────────┐
│   DevOps VM     │
│  (Private IP)   │
└────────┬────────┘
         │
         │ 1. HTTPS Request
         ↓
┌─────────────────────┐
│  DevOps Subnet RT   │
│  0.0.0.0/0 → TGW    │
└────────┬────────────┘
         │
         │ 2. Route to TGW
         ↓
┌─────────────────────┐
│  Transit Gateway    │
│  (Hub Routing)      │
└────────┬────────────┘
         │
         │ 3. Forward to Perimeter
         ↓
┌─────────────────────┐
│  Perimeter VPC      │
│  Egress Subnet      │
└────────┬────────────┘
         │
         │ 4. Route to NAT
         ↓
┌─────────────────────┐
│   NAT Gateway       │
│  (Public IP/EIP)    │
└────────┬────────────┘
         │
         │ 5. Forward to Internet
         ↓
┌─────────────────────┐
│     Internet        │
│  (HTTPS Libraries)  │
└─────────────────────┘
```

---

#### **SSM Session Manager Access Flow:**
```
┌─────────────────────┐
│  DevOps Engineer    │
│  (AWS Console/CLI)  │
└────────┬────────────┘
         │
         │ 1. Start Session
         ↓
┌─────────────────────────┐
│  SSM Service            │
│  (AWS Managed)          │
└────────┬────────────────┘
         │
         │ 2. Connect via VPC Endpoint
         ↓
┌─────────────────────────┐
│  SSM VPC Endpoint       │
│  (Interface, Private)   │
└────────┬────────────────┘
         │
         │ 3. Private connection
         ↓
┌─────────────────────────┐
│  DevOps VM              │
│  (SSM Agent Running)    │
│  (IAM Role Attached)    │
└─────────────────────────┘

Key Security Points:
- No public IP needed
- No SSH keys required
- Traffic stays within AWS network
- IAM role-based authentication
```

---

### **10. Deployment Instructions**

#### **Prerequisites:**
- AWS Account with appropriate permissions
- S3 bucket for Terraform state (manual creation)
- IAM user for Terraform (tf-user) with programmatic access
- GitLab account and repository
- VPCs can be created manually or via Terraform

---

#### **Local Deployment:**

**Step 1: Configure AWS Credentials**
```bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_REGION="ap-southeast-1"
```

**Step 2: Deploy Perimeter VPC**
```bash
cd Training1/Perimeter
terraform init
terraform plan
terraform apply
```

**Step 3: Deploy DevOps VPC**
```bash
cd ../DevOps
terraform init
terraform plan
terraform apply
```

**Step 4: Verify Deployment**
```bash
# Check EC2 instance
aws ec2 describe-instances --filters "Name=tag:Name,Values=devops-instance"

# Start SSM session
aws ssm start-session --target <instance-id>
```

---

#### **GitLab CI/CD Deployment:**

**Step 1: Configure GitLab Variables**
```
Settings → CI/CD → Variables:
- AWS_ACCESS_KEY_ID (Protected, Masked)
- AWS_SECRET_ACCESS_KEY (Protected, Masked)
```

**Step 2: Push Code to GitLab**
```bash
git add .
git commit -m "Initial infrastructure setup"
git push origin main
```

**Step 3: Monitor Pipeline**
```
Pipeline automatically triggers:
1. Validates Perimeter config
2. Plans Perimeter changes
3. Applies Perimeter (auto)
4. Validates DevOps config
5. Plans DevOps changes
6. Waits for manual approval
```

**Step 4: Approve DevOps Deployment**
```
Click "Play" button on devops-network-apply stage
```

---

### **11. Testing and Validation**

#### **Test 1: Internet Connectivity**
```bash
# Connect to DevOps VM via SSM
aws ssm start-session --target <instance-id>

# Test HTTPS connectivity
curl -I https://www.google.com
curl https://ipinfo.io/ip  # Should show NAT Gateway public IP
```

#### **Test 2: SSM Access**
```bash
# Verify SSM endpoint
aws ec2 describe-vpc-endpoints --filters "Name=vpc-id,Values=<devops-vpc-id>"

# Check instance SSM status
aws ssm describe-instance-information --instance-id <instance-id>
```

#### **Test 3: Routing**
```bash
# On DevOps VM
ip route show
# Should show default route via TGW ENI

# Verify TGW attachments
aws ec2 describe-transit-gateway-attachments
```

#### **Test 4: Module Validation**
```bash
# Verify each subnet has its own RT and NACL
aws ec2 describe-route-tables --filters "Name=vpc-id,Values=<vpc-id>"
aws ec2 describe-network-acls --filters "Name=vpc-id,Values=<vpc-id>"
```

---

### **12. Troubleshooting**

#### **Issue 1: EC2 Cannot Reach Internet**
**Symptoms:** `curl` commands fail
**Checks:**
```bash
1. Verify route table: aws ec2 describe-route-tables
2. Check TGW attachment state: aws ec2 describe-transit-gateway-attachments
3. Verify NAT Gateway: aws ec2 describe-nat-gateways
4. Check security group: aws ec2 describe-security-groups
```

#### **Issue 2: SSM Session Manager Not Working**
**Symptoms:** Cannot start session
**Checks:**
```bash
1. Verify IAM role attached: aws ec2 describe-instances
2. Check SSM agent status: aws ssm describe-instance-information
3. Verify VPC endpoint: aws ec2 describe-vpc-endpoints
4. Check endpoint security group: Allow 443 from VPC CIDR
```

#### **Issue 3: Terraform Apply Fails**
**Symptoms:** Pipeline fails at apply stage
**Common Causes:**
- AWS credentials expired
- IAM permissions insufficient
- Resource limits reached
- State file locked

**Resolution:**
```bash
# Check state lock
aws dynamodb get-item --table-name terraform-locks

# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

#### **Issue 4: Remote State Not Found**
**Symptoms:** DevOps plan cannot read Perimeter outputs
**Resolution:**
```bash
# Verify state file exists
ls ../Perimeter/terraform.tfstate.backup

# Check outputs in Perimeter
cd ../Perimeter
terraform output
```

---

### **13. Cost Estimation**

#### **Monthly AWS Costs (Approximate):**

**Perimeter VPC:**
- NAT Gateway: ~$32/month (+ data transfer)
- Elastic IP: $0 (while attached)
- Transit Gateway: ~$36/month + data transfer
- Internet Gateway: Free

**DevOps VPC:**
- EC2 t2.micro: ~$8.50/month (if running 24/7)
- SSM VPC Endpoint: ~$7/month
- Transit Gateway attachment: ~$36/month

**Total Estimated Cost:** ~$120-150/month

**Cost Optimization Tips:**
- Stop EC2 instance when not in use
- Use smaller instance types
- Monitor data transfer costs
- Consider NAT instance instead of NAT Gateway for dev

---

### **14. Best Practices Implemented**

#### **Infrastructure:**
✅ Private subnets for workloads
✅ Centralized internet egress
✅ VPC endpoints for AWS services
✅ Individual route tables per subnet
✅ Network ACLs for subnet-level security
✅ Security groups for instance-level security

#### **Security:**
✅ No public IPs on private resources
✅ IAM roles instead of access keys on EC2
✅ SSM Session Manager for secure access
✅ Principle of least privilege
✅ Private endpoints for AWS services

#### **Code Quality:**
✅ Modular Terraform code
✅ Nested modules for reusability
✅ DRY principle
✅ Clear naming conventions
✅ Comments and documentation

#### **CI/CD:**
✅ Automated validation
✅ Plan before apply
✅ Manual approval for production
✅ Artifact management
✅ Environment variables for credentials

---

### **15. Future Enhancements**

#### **Security Improvements:**
- [ ] Implement AWS Network Firewall in inspection subnet
- [ ] Add VPC Flow Logs for traffic analysis
- [ ] Configure GuardDuty for threat detection
- [ ] Implement AWS Config for compliance
- [ ] Add CloudWatch alarms for monitoring

#### **Architecture Enhancements:**
- [ ] Add additional spoke VPCs
- [ ] Implement VPC peering for specific connections
- [ ] Add AWS PrivateLink for SaaS connectivity
- [ ] Implement Route 53 Resolver for DNS
- [ ] Add backup and disaster recovery

#### **CI/CD Improvements:**
- [ ] Add automated testing (terraform fmt, tflint)
- [ ] Implement drift detection
- [ ] Add cost estimation in pipeline
- [ ] Implement policy as code (OPA, Sentinel)
- [ ] Add rollback capabilities

#### **Monitoring and Logging:**
- [ ] Centralized logging with CloudWatch
- [ ] Implement X-Ray for tracing
- [ ] Add custom metrics and dashboards
- [ ] Configure SNS for alerting
- [ ] Implement log aggregation

---

### **16. References**

#### **AWS Documentation:**
- [AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/)
- [Systems Manager Session Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html)
- [VPC Endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [NAT Gateway](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)

#### **Terraform Documentation:**
- [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Modules](https://www.terraform.io/docs/language/modules/index.html)
- [Remote State](https://www.terraform.io/docs/language/state/remote.html)

#### **GitLab CI/CD:**
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [Terraform in GitLab](https://docs.gitlab.com/ee/user/infrastructure/iac/)

---

### **17. Contact and Support**

**Owner:** Muhamad Affindi bin Kamarudin

**Repository:** privatevpc-task

**For Questions or Issues:**
- Review this documentation
- Check AWS CloudWatch logs
- Review Terraform state files
- Consult AWS support if needed

---

## **Summary**

This architecture demonstrates a production-ready AWS infrastructure implementing:
- ✅ Secure private workload deployment
- ✅ Centralized internet egress
- ✅ Hub-and-spoke network topology
- ✅ Infrastructure as Code with Terraform
- ✅ CI/CD automation with GitLab
- ✅ AWS best practices and security principles

The modular design allows for easy expansion to additional VPCs and workloads while maintaining centralized control and monitoring through the Perimeter VPC hub.

---

**Last Updated:** November 2025
**Version:** 1.0
**Status:** Production Ready
