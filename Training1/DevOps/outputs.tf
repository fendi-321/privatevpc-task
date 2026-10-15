output "devops_instance_id" {
  description = "The ID of the DevOps EC2 instance"
  value       = aws_instance.devops_instance.id
}

output "devops_vpc_id" {
  description = "The ID of the devops VPC"
  value       = module.vpc_devops.vpc_id
}

output "devops_ssm_start_session" {
  description = "Command to open a private shell on the DevOps instance via SSM"
  value       = "aws ssm start-session --target ${aws_instance.devops_instance.id}"
}
