variable "aws_region" {
  type        = string
  description = "AWS region to deploy into"
  default     = "eu-west-2"
}

variable "project_name" {
  type        = string
  description = "Name prefix for resources"
  default     = "three-tier"
}

variable "eks_cluster_name" {
  type        = string
  description = "Planned EKS cluster name (for subnet tagging)"
  default     = "three-tier-eks"
}

variable "azs" {
  type        = list(string)
  description = "Availability Zones to use"
  default     = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]
}

# --- Networking (override if needed) ---
variable "vpc_cidr" {
  type        = string
  description = "CIDR for the VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  type        = list(string)
  description = "Public subnet CIDRs"
  default     = ["10.0.0.0/24", "10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  type        = list(string)
  description = "Private subnet CIDRs"
  default     = ["10.0.10.0/24", "10.0.11.0/24", "10.0.12.0/24"]
}

# --- EKS ---
variable "kubernetes_version" {
  type        = string
  description = "EKS Kubernetes version"
  default     = "1.29"

  validation {
    condition     = can(regex("^1\\.(2[0-9]|1[0-9])$", var.kubernetes_version))
    error_message = "kubernetes_version must look like 1.2x (e.g. 1.27, 1.28, 1.29)."
  }
}

variable "eks_instance_types" {
  type        = list(string)
  description = "Node instance types"
  default     = ["t3.medium"]
}

variable "eks_desired_size" {
  type        = number
  description = "Desired node count"
  default     = 2
}

variable "eks_min_size" {
  type        = number
  description = "Min node count"
  default     = 2
}

variable "eks_max_size" {
  type        = number
  description = "Max node count"
  default     = 4
}

# Restrict public access to the EKS API to your IP
variable "admin_cidr" {
  type        = string
  description = "Your public IP in CIDR form allowed to access EKS public endpoint (e.g., 197.211.63.121/32)"
}

# --- Validations ---
variable "env" {
  type        = string
  description = "Environment tag"
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.env)
    error_message = "env must be one of: dev, staging, prod."
  }
}

# Cross-field validations (done via locals + preconditions)
locals {
  eks_size_ok = var.eks_min_size <= var.eks_desired_size && var.eks_desired_size <= var.eks_max_size
}

# Optional: enforce size relation at plan time
resource "null_resource" "validate_eks_sizes" {
  lifecycle {
    precondition {
      condition     = local.eks_size_ok
      error_message = "eks_min_size <= eks_desired_size <= eks_max_size must hold."
    }
  }
}
