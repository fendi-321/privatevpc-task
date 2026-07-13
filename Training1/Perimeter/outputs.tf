output "tgw_id" {
  description = "The ID of the Transit Gateway"
  value       = aws_ec2_transit_gateway.tgw.id
}

output "perimeter_vpc_cidr" {
  description = "The CIDR block of the perimeter VPC"
  value       = module.vpc_perimeter.cidr_block
}
