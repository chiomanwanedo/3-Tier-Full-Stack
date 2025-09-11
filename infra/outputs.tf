# Core VPC
output "vpc_id" {
  value       = module.vpc.vpc_id
  description = "VPC ID"
}

output "public_subnets" {
  value       = module.vpc.public_subnets
  description = "Public subnet IDs (list)"
}

output "private_subnets" {
  value       = module.vpc.private_subnets
  description = "Private subnet IDs (list)"
}

output "public_route_table_ids" {
  value       = module.vpc.public_route_table_ids
  description = "Public route table IDs (list)"
}

output "private_route_table_ids" {
  value       = module.vpc.private_route_table_ids
  description = "Private route table IDs (list)"
}

output "natgw_ids" {
  value       = module.vpc.natgw_ids
  description = "NAT Gateway IDs (list)"
}

# EKS
output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS cluster name"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS API server endpoint"
}

# Mark CA data as sensitive to avoid dumping it in logs/CI
output "eks_cluster_ca" {
  value       = module.eks.cluster_certificate_authority_data
  description = "Base64-encoded cluster CA data"
  sensitive   = true
}

# Handy extras
output "region" {
  value       = var.aws_region
  description = "AWS region"
}

output "cluster_security_group_id" {
  value       = module.eks.cluster_security_group_id
  description = "Cluster security group ID"
}

# OIDC provider (useful for IRSA/Controllers)
output "oidc_provider_arn" {
  value       = module.eks.oidc_provider_arn
  description = "OIDC provider ARN for IRSA"
}
