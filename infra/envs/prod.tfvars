aws_region       = "eu-west-2"
project_name     = "three-tier"
env              = "prod"

eks_cluster_name = "three-tier-eks"
kubernetes_version = "1.29"

azs              = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]

vpc_cidr         = "10.0.0.0/16"
public_subnets   = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
private_subnets  = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]

eks_instance_types = ["t3.medium"]
eks_min_size       = 2
eks_desired_size   = 2
eks_max_size       = 4

# Replace with your current public IP + /32
admin_cidr         = "197.211.63.121/32"

