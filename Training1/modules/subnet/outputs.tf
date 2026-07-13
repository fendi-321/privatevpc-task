output "subnet_id" {
  description = "The ID of the subnet"
  value       = aws_subnet.main.id
}

output "route_table_id" {
  description = "The ID of the route table"
  value       = module.rt.route_table_id
}
