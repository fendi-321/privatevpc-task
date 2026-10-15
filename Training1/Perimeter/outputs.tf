output "perimeter_vpc_id" {
  description = "The ID of the perimeter VPC"
  value       = module.vpc_perimeter.vpc_id
}

output "nat_gateway_public_ip" {
  description = "Public IP of the perimeter NAT gateway, i.e. the egress address seen by the internet"
  value       = aws_eip.nat.public_ip
}

output "tgw_id" {
  description = "The ID of the Transit Gateway"
  value       = aws_ec2_transit_gateway.tgw.id
}

output "perimeter_vpc_cidr" {
  description = "The CIDR block of the perimeter VPC"
  value       = module.vpc_perimeter.cidr_block
}
