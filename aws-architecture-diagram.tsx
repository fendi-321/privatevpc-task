import React from 'react';

const ArchitectureDiagram = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <svg viewBox="0 0 950 700" className="w-full h-auto max-w-5xl mx-auto">
        <defs>
          <linearGradient id="vpcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f2744" />
          </linearGradient>
          <linearGradient id="subnetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a4d1a" />
            <stop offset="100%" stopColor="#0d2d0d" />
          </linearGradient>
          <linearGradient id="tgwSubnetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a1a4a" />
            <stop offset="100%" stopColor="#2d0d2d" />
          </linearGradient>
          <linearGradient id="perimeterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5c3d1e" />
            <stop offset="100%" stopColor="#3d280f" />
          </linearGradient>
          
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
        </defs>

        {/* Background */}
        <rect width="950" height="700" fill="#0f172a" />

        {/* AWS Cloud boundary */}
        <rect x="20" y="20" width="910" height="660" rx="15" fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="8,4" />
        <text x="40" y="50" fill="#f97316" fontSize="16" fontWeight="bold">☁️ AWS Cloud - ap-southeast-1</text>

        {/* Perimeter VPC (Remote State) */}
        <rect x="620" y="70" width="280" height="200" rx="10" fill="url(#perimeterGrad)" stroke="#f97316" strokeWidth="2" />
        <text x="640" y="95" fill="#fb923c" fontSize="14" fontWeight="bold">Perimeter VPC</text>
        <text x="640" y="113" fill="#fcd34d" fontSize="11" fontFamily="monospace">10.0.0.0/16</text>
        <text x="640" y="128" fill="#a3a3a3" fontSize="9">(Remote State)</text>
        
        {/* Transit Gateway in Perimeter */}
        <rect x="660" y="150" width="200" height="100" rx="8" fill="#1e1e2e" stroke="#a855f7" strokeWidth="2" />
        <text x="760" y="180" fill="#c084fc" fontSize="12" fontWeight="bold" textAnchor="middle">🔀 Transit Gateway</text>
        <text x="760" y="200" fill="#a3a3a3" fontSize="9" textAnchor="middle">aws_ec2_transit_gateway</text>
        <text x="760" y="218" fill="#a3a3a3" fontSize="9" textAnchor="middle">Hub for VPC connectivity</text>
        <text x="760" y="236" fill="#67e8f9" fontSize="9" textAnchor="middle">Routing Domain</text>

        {/* DevOps VPC */}
        <rect x="40" y="70" width="550" height="560" rx="10" fill="url(#vpcGrad)" stroke="#3b82f6" strokeWidth="2" />
        <text x="60" y="95" fill="#60a5fa" fontSize="14" fontWeight="bold">🌐 VPC DevOps</text>
        <text x="60" y="113" fill="#fcd34d" fontSize="12" fontFamily="monospace">10.1.0.0/16</text>
        <text x="60" y="128" fill="#a3a3a3" fontSize="9">module.vpc_devops</text>

        {/* DevOps Private Subnet */}
        <rect x="60" y="150" width="370" height="300" rx="8" fill="url(#subnetGrad)" stroke="#22c55e" strokeWidth="2" />
        <text x="80" y="175" fill="#4ade80" fontSize="12" fontWeight="bold">📦 DevOps Private Subnet</text>
        <text x="80" y="193" fill="#fcd34d" fontSize="11" fontFamily="monospace">10.1.1.0/24</text>
        <text x="80" y="208" fill="#a3a3a3" fontSize="9">module.devops_subnet | AZ: ap-southeast-1a</text>

        {/* NACL badge */}
        <rect x="330" y="160" width="80" height="28" rx="4" fill="#164e63" stroke="#22d3d1" strokeWidth="1" />
        <text x="370" y="178" fill="#22d3d1" fontSize="9" textAnchor="middle">🛡️ NACL</text>

        {/* Route Table badge */}
        <rect x="240" y="160" width="80" height="28" rx="4" fill="#3f3f46" stroke="#a1a1aa" strokeWidth="1" />
        <text x="280" y="178" fill="#a1a1aa" fontSize="9" textAnchor="middle">📍 Route Table</text>

        {/* EC2 Instance */}
        <rect x="90" y="225" width="200" height="110" rx="8" fill="#1e1e2e" stroke="#f59e0b" strokeWidth="2" />
        <text x="190" y="252" fill="#fbbf24" fontSize="12" fontWeight="bold" textAnchor="middle">💻 EC2 Instance</text>
        <text x="190" y="272" fill="#a3a3a3" fontSize="9" textAnchor="middle">aws_instance.devops_instance</text>
        <text x="190" y="290" fill="#67e8f9" fontSize="10" fontFamily="monospace" textAnchor="middle">10.1.1.10</text>
        <text x="190" y="308" fill="#a3a3a3" fontSize="9" textAnchor="middle">Amazon Linux 2</text>
        <text x="190" y="323" fill="#ec4899" fontSize="8" textAnchor="middle">IAM: ec2_ssm_profile</text>

        {/* VPC Endpoint SSM */}
        <rect x="90" y="350" width="200" height="85" rx="8" fill="#1e1e2e" stroke="#84cc16" strokeWidth="2" />
        <text x="190" y="375" fill="#a3e635" fontSize="11" fontWeight="bold" textAnchor="middle">🔌 VPC Endpoint (SSM)</text>
        <text x="190" y="393" fill="#a3a3a3" fontSize="9" textAnchor="middle">aws_vpc_endpoint.ssm</text>
        <text x="190" y="410" fill="#67e8f9" fontSize="9" fontFamily="monospace" textAnchor="middle">10.1.1.50 (ENI)</text>
        <text x="190" y="425" fill="#a3a3a3" fontSize="8" textAnchor="middle">Private SSM Access</text>

        {/* Security Group */}
        <rect x="310" y="270" width="105" height="70" rx="6" fill="#1e1e2e" stroke="#f97316" strokeWidth="1.5" />
        <text x="362" y="295" fill="#fb923c" fontSize="10" fontWeight="bold" textAnchor="middle">🔒 Security Group</text>
        <text x="362" y="312" fill="#a3a3a3" fontSize="8" textAnchor="middle">ssm_endpoint_sg</text>
        <text x="362" y="328" fill="#67e8f9" fontSize="8" textAnchor="middle">Ingress: 443/tcp</text>

        {/* TGW Attachment Subnet */}
        <rect x="60" y="470" width="370" height="140" rx="8" fill="url(#tgwSubnetGrad)" stroke="#a855f7" strokeWidth="2" />
        <text x="80" y="495" fill="#c084fc" fontSize="12" fontWeight="bold">🔗 TGW Attachment Subnet</text>
        <text x="80" y="513" fill="#fcd34d" fontSize="11" fontFamily="monospace">10.1.2.0/28</text>
        <text x="80" y="528" fill="#a3a3a3" fontSize="9">module.tgwa_devops_subnet | AZ: ap-southeast-1a</text>

        {/* NACL badge for TGW subnet */}
        <rect x="330" y="480" width="80" height="28" rx="4" fill="#164e63" stroke="#22d3d1" strokeWidth="1" />
        <text x="370" y="498" fill="#22d3d1" fontSize="9" textAnchor="middle">🛡️ NACL</text>

        {/* TGW Attachment */}
        <rect x="100" y="545" width="220" height="50" rx="6" fill="#1e1e2e" stroke="#a855f7" strokeWidth="2" />
        <text x="210" y="567" fill="#c084fc" fontSize="10" fontWeight="bold" textAnchor="middle">TGW VPC Attachment</text>
        <text x="210" y="583" fill="#a3a3a3" fontSize="8" textAnchor="middle">aws_ec2_transit_gateway_vpc_attachment</text>

        {/* IAM Section */}
        <rect x="450" y="150" width="130" height="170" rx="8" fill="#1e1e2e" stroke="#ec4899" strokeWidth="2" />
        <text x="515" y="175" fill="#f472b6" fontSize="11" fontWeight="bold" textAnchor="middle">👤 IAM</text>
        <text x="515" y="198" fill="#a3a3a3" fontSize="8" textAnchor="middle">ec2_ssm_role</text>
        <text x="515" y="215" fill="#a3a3a3" fontSize="10" textAnchor="middle">↓</text>
        <text x="515" y="232" fill="#a3a3a3" fontSize="8" textAnchor="middle">ec2_ssm_profile</text>
        <text x="515" y="249" fill="#a3a3a3" fontSize="10" textAnchor="middle">↓</text>
        <text x="515" y="266" fill="#a3a3a3" fontSize="8" textAnchor="middle">Policy Attachment</text>
        <rect x="462" y="278" width="106" height="28" rx="4" fill="#be185d" />
        <text x="515" y="296" fill="#fff" fontSize="8" textAnchor="middle">SSMManagedInstance</text>

        {/* Routes */}
        <rect x="450" y="340" width="130" height="100" rx="8" fill="#1e1e2e" stroke="#06b6d4" strokeWidth="2" />
        <text x="515" y="365" fill="#22d3d1" fontSize="11" fontWeight="bold" textAnchor="middle">🛤️ Routes</text>
        <text x="515" y="385" fill="#a3a3a3" fontSize="8" textAnchor="middle">devops_private_tgw</text>
        <text x="515" y="400" fill="#67e8f9" fontSize="8" fontFamily="monospace" textAnchor="middle">0.0.0.0/0 → TGW</text>
        <text x="515" y="418" fill="#a3a3a3" fontSize="8" textAnchor="middle">devops_tgw_perimeter</text>
        <text x="515" y="433" fill="#67e8f9" fontSize="8" fontFamily="monospace" textAnchor="middle">10.0.0.0/16 → TGW</text>

        {/* Connection Lines */}
        {/* TGW Attachment to Transit Gateway */}
        <path d="M 320 570 Q 500 500 660 200" stroke="#a855f7" strokeWidth="2" strokeDasharray="5,3" fill="none" markerEnd="url(#arrowhead)" />
        
        {/* Route to TGW */}
        <path d="M 580 390 Q 620 350 660 220" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4,2" fill="none" markerEnd="url(#arrowhead)" />

        {/* EC2 to VPC Endpoint */}
        <line x1="190" y1="335" x2="190" y2="350" stroke="#84cc16" strokeWidth="1.5" />

        {/* IAM to EC2 */}
        <path d="M 450 240 Q 380 240 290 270" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />

        {/* SG to VPC Endpoint */}
        <line x1="310" y1="310" x2="290" y2="370" stroke="#f97316" strokeWidth="1" strokeDasharray="3,2" />

        {/* Legend */}
        <rect x="640" y="300" width="250" height="230" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1" />
        <text x="660" y="325" fill="#94a3b8" fontSize="11" fontWeight="bold">Legend</text>
        
        <rect x="660" y="345" width="12" height="12" fill="#3b82f6" />
        <text x="680" y="355" fill="#a3a3a3" fontSize="9">VPC (10.x.0.0/16)</text>
        
        <rect x="660" y="365" width="12" height="12" fill="#22c55e" />
        <text x="680" y="375" fill="#a3a3a3" fontSize="9">Private Subnet (/24)</text>
        
        <rect x="660" y="385" width="12" height="12" fill="#a855f7" />
        <text x="680" y="395" fill="#a3a3a3" fontSize="9">TGW Subnet (/28)</text>
        
        <rect x="660" y="405" width="12" height="12" fill="#f59e0b" />
        <text x="680" y="415" fill="#a3a3a3" fontSize="9">EC2 Instance</text>
        
        <rect x="660" y="425" width="12" height="12" fill="#84cc16" />
        <text x="680" y="435" fill="#a3a3a3" fontSize="9">VPC Endpoint</text>
        
        <rect x="660" y="445" width="12" height="12" fill="#ec4899" />
        <text x="680" y="455" fill="#a3a3a3" fontSize="9">IAM Resources</text>

        <rect x="660" y="465" width="12" height="12" fill="#22d3d1" />
        <text x="680" y="475" fill="#a3a3a3" fontSize="9">NACL / Security</text>

        <line x1="660" y1="491" x2="680" y2="491" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2" />
        <text x="690" y="495" fill="#a3a3a3" fontSize="9">TGW Connection</text>

        <rect x="660" y="505" width="12" height="12" fill="#fcd34d" rx="2" />
        <text x="680" y="515" fill="#a3a3a3" fontSize="9">CIDR Block</text>

        {/* Title */}
        <text x="475" y="680" fill="#64748b" fontSize="10" textAnchor="middle">DevOps Infrastructure - Terraform Managed | Training1/DevOps</text>
      </svg>
      
      {/* CIDR Summary Table */}
      <div className="max-w-5xl mx-auto mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-cyan-400 font-bold mb-3">📋 CIDR Block Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900 p-3 rounded-lg">
            <div className="text-blue-400 font-semibold">VPC DevOps</div>
            <div className="text-yellow-300 font-mono">10.1.0.0/16</div>
            <div className="text-gray-400 text-xs">65,536 IPs available</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg">
            <div className="text-orange-400 font-semibold">Perimeter VPC</div>
            <div className="text-yellow-300 font-mono">10.0.0.0/16</div>
            <div className="text-gray-400 text-xs">65,536 IPs available</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg">
            <div className="text-green-400 font-semibold">DevOps Private Subnet</div>
            <div className="text-yellow-300 font-mono">10.1.1.0/24</div>
            <div className="text-gray-400 text-xs">256 IPs (251 usable)</div>
          </div>
          <div className="bg-slate-900 p-3 rounded-lg">
            <div className="text-purple-400 font-semibold">TGW Attachment Subnet</div>
            <div className="text-yellow-300 font-mono">10.1.2.0/28</div>
            <div className="text-gray-400 text-xs">16 IPs (11 usable)</div>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-3">* Replace these example CIDRs with your actual values from Terraform variables</p>
      </div>
    </div>
  );
};

export default ArchitectureDiagram;