module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr

  azs             = var.azs
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets

  # Gateways
  enable_nat_gateway   = true
  single_nat_gateway   = true # cost saver; one NAT for all private subnets
  enable_dns_hostnames = true
  enable_dns_support   = true

  # Helpful tags for EKS/ALB discovery
  public_subnet_tags = {
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${var.eks_cluster_name}" = "shared"
  }

  tags = {
    Project = var.project_name
    Env     = var.env
  }
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  # --- Cluster basics ---
  cluster_name    = var.eks_cluster_name
  cluster_version = var.kubernetes_version

  # --- Networking ---
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets # worker nodes in private subnets

  # --- Endpoint access (public limited to your IP, private enabled) ---
  cluster_endpoint_public_access       = true
  cluster_endpoint_private_access      = true
  cluster_endpoint_public_access_cidrs = [var.admin_cidr]

  # --- IRSA ---
  enable_irsa = true

  # --- Node group ---
  eks_managed_node_groups = {
    default = {
      min_size       = var.eks_min_size
      max_size       = var.eks_max_size
      desired_size   = var.eks_desired_size
      instance_types = var.eks_instance_types
      capacity_type  = "ON_DEMAND"
      labels         = { role = "worker" }
    }
  }

  # --- Grant your IAM user cluster-admin ---
  enable_cluster_creator_admin_permissions = true

  # --- Tags ---
  tags = {
    Project = var.project_name
    Env     = var.env
  }
}
