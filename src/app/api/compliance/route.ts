import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Controls seeded for each framework when added
const FRAMEWORK_CONTROLS: Record<string, Array<{ control_id: string; name: string; description: string; category: string }>> = {
  POPIA: [
    { control_id: 'POPIA-1',  name: 'Appoint Information Officer',            description: 'Designate an Information Officer responsible for ensuring POPIA compliance across the organisation',              category: 'Governance' },
    { control_id: 'POPIA-2',  name: 'Lawful Basis for Processing',             description: 'Ensure personal information is processed lawfully and in a reasonable manner that does not infringe privacy',      category: 'Data Processing' },
    { control_id: 'POPIA-3',  name: 'Data Minimisation',                       description: 'Collect only personal information that is adequate, relevant and not excessive for the purpose',                   category: 'Data Processing' },
    { control_id: 'POPIA-4',  name: 'Purpose Specification',                   description: 'Collect personal information only for a specific, explicitly defined and lawful purpose',                          category: 'Data Processing' },
    { control_id: 'POPIA-5',  name: 'Retention Limitation',                    description: 'Do not retain personal information longer than necessary to achieve the collection purpose',                        category: 'Data Processing' },
    { control_id: 'POPIA-6',  name: 'Further Processing Limitation',           description: 'Ensure any further processing of personal information is compatible with the original collection purpose',          category: 'Data Processing' },
    { control_id: 'POPIA-7',  name: 'Information Quality & Accuracy',          description: 'Take reasonably practicable steps to ensure personal information is complete, accurate and up to date',             category: 'Data Quality' },
    { control_id: 'POPIA-8',  name: 'Openness — Notification to Regulator',   description: 'Maintain documentation of all processing operations under responsibility of the responsible party',                 category: 'Transparency' },
    { control_id: 'POPIA-9',  name: 'Openness — Privacy Notice to Subjects',  description: 'Notify data subjects of the collection of their personal information and the purpose for collection',               category: 'Transparency' },
    { control_id: 'POPIA-10', name: 'Security Safeguards — Technical',         description: 'Implement appropriate technical measures to secure personal information against loss, damage or unauthorised access', category: 'Security' },
    { control_id: 'POPIA-11', name: 'Security Safeguards — Operator Contracts', description: 'Ensure operators processing personal information are bound by written POPIA-compliant contracts',                 category: 'Security' },
    { control_id: 'POPIA-12', name: 'Data Breach Notification',                description: 'Notify the Information Regulator and affected data subjects of security compromises without unreasonable delay',    category: 'Security' },
    { control_id: 'POPIA-13', name: 'Data Subject Access Requests',            description: 'Implement a process allowing data subjects to request access to their personal information within 30 days',         category: 'Rights' },
    { control_id: 'POPIA-14', name: 'Right to Correction and Deletion',        description: 'Allow data subjects to request correction or deletion of their personal information',                               category: 'Rights' },
    { control_id: 'POPIA-15', name: 'Special Personal Information Controls',   description: 'Do not process special personal information (health, religion, race, biometrics) without meeting specific conditions', category: 'Special Data' },
  ],
  'ISO 27001': [
    { control_id: 'A.5.1',  name: 'Policies for Information Security',        description: 'Information security policy defined, approved by management, published and communicated to all staff',           category: 'Organisational Controls' },
    { control_id: 'A.5.2',  name: 'Information Security Roles',                description: 'Information security roles and responsibilities clearly defined and allocated within the organisation',           category: 'Organisational Controls' },
    { control_id: 'A.5.15', name: 'Access Control Policy',                     description: 'Rules to control physical and logical access to information and assets established and implemented',              category: 'Organisational Controls' },
    { control_id: 'A.5.26', name: 'Incident Response Procedures',              description: 'Information security incidents responded to in accordance with documented procedures',                            category: 'Organisational Controls' },
    { control_id: 'A.6.1',  name: 'Pre-Employment Screening',                  description: 'Background verification checks on all candidates for employment carried out prior to joining',                   category: 'People Controls' },
    { control_id: 'A.6.3',  name: 'Security Awareness & Training',             description: 'Personnel receive appropriate security awareness education and training relevant to their job function',          category: 'People Controls' },
    { control_id: 'A.6.8',  name: 'Security Event Reporting',                  description: 'Mechanism in place for personnel to report observed or suspected security events timely',                         category: 'People Controls' },
    { control_id: 'A.7.1',  name: 'Physical Security Perimeters',              description: 'Security perimeters defined and used to protect areas containing sensitive information and assets',               category: 'Physical Controls' },
    { control_id: 'A.7.2',  name: 'Physical Entry Controls',                   description: 'Secure areas protected by appropriate entry controls and access points to authorised personnel only',             category: 'Physical Controls' },
    { control_id: 'A.8.1',  name: 'User Endpoint Device Security',             description: 'Information stored on, processed by or accessible via user endpoint devices is appropriately protected',          category: 'Technological Controls' },
    { control_id: 'A.8.2',  name: 'Privileged Access Rights Management',       description: 'Allocation and use of privileged access rights restricted and managed through a formal process',                  category: 'Technological Controls' },
    { control_id: 'A.8.5',  name: 'Secure Authentication (MFA)',               description: 'Secure authentication technologies and procedures implemented — multi-factor authentication enforced',             category: 'Technological Controls' },
    { control_id: 'A.8.7',  name: 'Protection Against Malware',                description: 'Protection against malware implemented and supported by appropriate user awareness training',                      category: 'Technological Controls' },
    { control_id: 'A.8.8',  name: 'Vulnerability Management',                  description: 'Technical vulnerabilities identified, evaluated and addressed through patching or compensating controls',          category: 'Technological Controls' },
    { control_id: 'A.8.15', name: 'Security Logging & Monitoring',             description: 'Logs that record activities, exceptions and security events produced, stored, protected and regularly reviewed',   category: 'Technological Controls' },
    { control_id: 'A.8.24', name: 'Cryptography Policy',                       description: 'Rules for effective use of cryptography including key management defined and implemented throughout the org',      category: 'Technological Controls' },
  ],
  'SOC 2': [
    { control_id: 'CC1.1', name: 'Commitment to Integrity and Ethics',         description: 'The entity demonstrates a commitment to integrity and ethical values in all operations',                           category: 'Control Environment' },
    { control_id: 'CC1.2', name: 'Board Oversight',                             description: 'The board of directors demonstrates independence from management and exercises oversight of internal controls',    category: 'Control Environment' },
    { control_id: 'CC2.1', name: 'Information Quality',                         description: 'The entity obtains and uses relevant quality information to support functioning of internal controls',             category: 'Communication' },
    { control_id: 'CC3.1', name: 'Risk Assessment — Objectives',                description: 'The entity specifies objectives with sufficient clarity to enable identification and assessment of related risks', category: 'Risk Assessment' },
    { control_id: 'CC3.2', name: 'Risk Identification',                          description: 'The entity identifies risks to the achievement of its objectives and analyses them as a basis for response',      category: 'Risk Assessment' },
    { control_id: 'CC6.1', name: 'Logical Access Security',                      description: 'The entity implements logical access security software, infrastructure and architectures to protect assets',      category: 'Logical Access' },
    { control_id: 'CC6.2', name: 'User Registration and Authorisation',          description: 'Prior to issuing credentials, the entity registers and authorises new internal and external users',              category: 'Logical Access' },
    { control_id: 'CC6.6', name: 'Protection Against External Threats',          description: 'The entity implements logical access security measures to protect against threats from sources outside boundaries', category: 'Logical Access' },
    { control_id: 'CC7.1', name: 'Configuration Monitoring',                     description: 'The entity uses detection and monitoring procedures to identify changes to configurations that may affect security', category: 'System Operations' },
    { control_id: 'CC7.2', name: 'Anomaly Detection and Monitoring',             description: 'The entity monitors system components and operations for anomalies that indicate malicious or unusual activity',  category: 'System Operations' },
    { control_id: 'CC7.3', name: 'Security Incident Evaluation',                 description: 'The entity evaluates security events to determine whether they could result in a security failure',              category: 'System Operations' },
    { control_id: 'CC8.1', name: 'Change Management Process',                    description: 'The entity authorises, designs, develops, tests, approves and implements changes to infrastructure and software', category: 'Change Management' },
    { control_id: 'CC9.1', name: 'Vendor Risk Management',                       description: 'The entity identifies and manages risks arising from vendors and business partners to meet objectives',           category: 'Risk Mitigation' },
  ],
  GDPR: [
    { control_id: 'GDPR-1',  name: 'Principles of Processing',                  description: 'Personal data processed lawfully, fairly, transparently, minimally, accurately, with limited storage and securely', category: 'Principles' },
    { control_id: 'GDPR-2',  name: 'Lawful Basis Documented',                   description: 'Identify and document a valid lawful basis for each category of personal data processing activity',               category: 'Lawful Basis' },
    { control_id: 'GDPR-3',  name: 'Consent Management',                        description: 'Where consent is the lawful basis, it must be freely given, specific, informed, unambiguous and withdrawable',    category: 'Consent' },
    { control_id: 'GDPR-4',  name: 'Privacy Notices (Articles 13/14)',           description: 'Provide clear and transparent privacy information to data subjects at or before the time of data collection',      category: 'Transparency' },
    { control_id: 'GDPR-5',  name: 'Right to Erasure (Article 17)',              description: 'Implement a process to handle requests from data subjects to have their personal data erased',                     category: 'Data Subject Rights' },
    { control_id: 'GDPR-6',  name: 'Right to Data Portability (Article 20)',     description: 'Provide personal data to subjects in a structured, commonly used, machine-readable format on request',            category: 'Data Subject Rights' },
    { control_id: 'GDPR-7',  name: 'Data Protection by Design (Article 25)',     description: 'Implement data protection principles into processing activities and systems from the outset',                      category: 'By Design' },
    { control_id: 'GDPR-8',  name: 'Data Processor Contracts (Article 28)',      description: 'Ensure contracts with all data processors include all required GDPR data processing agreement clauses',            category: 'Third Parties' },
    { control_id: 'GDPR-9',  name: 'Records of Processing Activities (Art 30)',  description: 'Maintain a written record of all personal data processing activities under your responsibility',                  category: 'Documentation' },
    { control_id: 'GDPR-10', name: 'Security of Processing (Article 32)',        description: 'Implement appropriate technical and organisational measures to ensure a level of security appropriate to risk',    category: 'Security' },
    { control_id: 'GDPR-11', name: 'Breach Notification 72hrs (Article 33)',     description: 'Notify supervisory authority of a personal data breach within 72 hours of becoming aware of it',                  category: 'Breach Response' },
    { control_id: 'GDPR-12', name: 'Data Protection Impact Assessment (Art 35)', description: 'Carry out a DPIA before processing likely to result in high risk to individuals',                                 category: 'Risk Assessment' },
  ],
  'King IV': [
    { control_id: 'KIV-1', name: 'Ethical and Effective Leadership',             description: 'The governing body should lead the organisation ethically and effectively',                                        category: 'Leadership' },
    { control_id: 'KIV-2', name: 'Responsible Corporate Citizenship',            description: 'The governing body should ensure the organisation is a responsible corporate citizen',                             category: 'Citizenship' },
    { control_id: 'KIV-3', name: 'Strategy and Performance Oversight',           description: 'The governing body should appreciate the organisation core purpose and shape its strategy accordingly',            category: 'Strategy' },
    { control_id: 'KIV-4', name: 'Risk Governance',                              description: 'The governing body should govern risk to support the organisation in setting and achieving its objectives',         category: 'Risk' },
    { control_id: 'KIV-5', name: 'Technology and Information Governance',        description: 'The governing body should govern technology and information in a way that supports the organisation',               category: 'Technology' },
    { control_id: 'KIV-6', name: 'Compliance Governance',                        description: 'The governing body should govern compliance with applicable laws and adopted non-binding rules',                    category: 'Compliance' },
    { control_id: 'KIV-7', name: 'Remuneration Governance',                      description: 'The governing body should ensure that remuneration is fair, responsible and transparent',                          category: 'Remuneration' },
    { control_id: 'KIV-8', name: 'Assurance and Audit',                          description: 'The governing body should ensure assurance services enable an effective control environment and integrity',        category: 'Assurance' },
  ],
  NIS2: [
    { control_id: 'NIS2-1',  name: 'Cybersecurity Risk Management Policy',       description: 'Implement appropriate and proportionate technical and organisational measures to manage cybersecurity risks',      category: 'Risk Management' },
    { control_id: 'NIS2-2',  name: 'Incident Handling Procedures',               description: 'Implement policies and procedures for detecting, managing and recovering from cybersecurity incidents',            category: 'Incident Response' },
    { control_id: 'NIS2-3',  name: 'Business Continuity and Disaster Recovery',  description: 'Implement backup management, disaster recovery and crisis management capabilities',                               category: 'Business Continuity' },
    { control_id: 'NIS2-4',  name: 'Supply Chain Security',                      description: 'Address cybersecurity in supply chain including security aspects of relationships with direct suppliers',          category: 'Supply Chain' },
    { control_id: 'NIS2-5',  name: 'Secure Development and Acquisition',         description: 'Security in network and information systems acquisition, development and maintenance including vulnerability mgmt', category: 'Development' },
    { control_id: 'NIS2-6',  name: 'Cyber Hygiene and Training',                 description: 'Implement basic cyber hygiene practices and provide cybersecurity training to all relevant staff',                 category: 'Hygiene' },
    { control_id: 'NIS2-7',  name: 'Cryptography and Encryption Policy',         description: 'Implement policies and procedures regarding the use of cryptography and end-to-end encryption',                   category: 'Cryptography' },
    { control_id: 'NIS2-8',  name: 'HR Security and Access Control',             description: 'Implement human resources security, access control policies and asset management procedures',                      category: 'HR Security' },
    { control_id: 'NIS2-9',  name: 'Multi-Factor Authentication (MFA)',          description: 'Use multi-factor authentication or continuous authentication solutions and secure communications',                 category: 'Access Control' },
    { control_id: 'NIS2-10', name: 'Significant Incident Reporting',             description: 'Report significant incidents to national CSIRT or competent authority within required timeframes',                 category: 'Reporting' },
  ],
  'PCI-DSS': [
    { control_id: 'PCI-1',  name: 'Network Security Controls',                   description: 'Install and maintain network security controls to protect the cardholder data environment',                        category: 'Network Security' },
    { control_id: 'PCI-2',  name: 'Secure Configurations',                       description: 'Apply secure configurations to all system components in the cardholder data environment',                          category: 'Configuration' },
    { control_id: 'PCI-3',  name: 'Protect Stored Account Data',                 description: 'Protect stored account data using strong cryptography — never store sensitive authentication data after authorisation', category: 'Data Protection' },
    { control_id: 'PCI-4',  name: 'Protect Cardholder Data in Transit',          description: 'Protect cardholder data with strong cryptography during transmission over open, public networks',                  category: 'Data Protection' },
    { control_id: 'PCI-5',  name: 'Malware Protection',                          description: 'Protect all systems and networks from malicious software with deployed anti-malware solutions',                    category: 'Malware Protection' },
    { control_id: 'PCI-6',  name: 'Secure Development Practices',                description: 'Develop and maintain secure systems and software — apply security patches within one month of release',            category: 'Secure Development' },
    { control_id: 'PCI-7',  name: 'Restrict Access by Need to Know',             description: 'Restrict access to system components and cardholder data by business need to know only',                          category: 'Access Control' },
    { control_id: 'PCI-8',  name: 'User Identification and Authentication',      description: 'Identify users and authenticate access to system components with unique IDs and strong authentication',            category: 'Identity' },
    { control_id: 'PCI-9',  name: 'Physical Access Restrictions',                description: 'Restrict physical access to cardholder data and cardholder data environment components',                           category: 'Physical Security' },
    { control_id: 'PCI-10', name: 'Logging and Monitoring',                      description: 'Log and monitor all access to system components and cardholder data — retain logs for at least 12 months',         category: 'Logging' },
    { control_id: 'PCI-11', name: 'Regular Security Testing',                    description: 'Test security of systems and networks regularly including penetration testing and vulnerability scans',             category: 'Testing' },
    { control_id: 'PCI-12', name: 'Information Security Policy',                 description: 'Support information security with organisational policies, programmes and an acceptable use policy',                category: 'Governance' },
  ],
  'NIST CSF': [
    { control_id: 'NIST-GV.1', name: 'Organisational Context and Risk Strategy', description: 'Cybersecurity risk management strategy, expectations and policy established, communicated and monitored',          category: 'Govern' },
    { control_id: 'NIST-ID.AM', name: 'Asset Management',                        description: 'Assets associated with data, personnel, devices, systems and facilities identified and managed consistently',      category: 'Identify' },
    { control_id: 'NIST-ID.RA', name: 'Risk Assessment',                         description: 'Cybersecurity risk to the organisation, assets and individuals is understood and used to inform decisions',         category: 'Identify' },
    { control_id: 'NIST-PR.AA', name: 'Identity Management and Access Control',  description: 'Access to physical and logical assets limited to authorised users, services and hardware and managed',             category: 'Protect' },
    { control_id: 'NIST-PR.AT', name: 'Awareness and Training',                  description: 'Personnel and partners provided with cybersecurity awareness education and training for their roles',               category: 'Protect' },
    { control_id: 'NIST-PR.DS', name: 'Data Security',                           description: 'Data managed consistent with risk strategy to protect confidentiality, integrity and availability',                 category: 'Protect' },
    { control_id: 'NIST-PR.PS', name: 'Platform Security',                       description: 'Hardware and software on physical and virtual platforms managed consistently with risk strategy',                   category: 'Protect' },
    { control_id: 'NIST-DE.AE', name: 'Adverse Event Analysis',                  description: 'Anomalies, indicators of compromise and other potentially adverse events analysed to characterise incidents',       category: 'Detect' },
    { control_id: 'NIST-DE.CM', name: 'Continuous Monitoring',                   description: 'Assets monitored to find anomalies, indicators of compromise and other potentially adverse events',                 category: 'Detect' },
    { control_id: 'NIST-RS.MA', name: 'Incident Management',                     description: 'Responses to detected cybersecurity incidents managed by executing incident response plans',                        category: 'Respond' },
    { control_id: 'NIST-RS.AN', name: 'Incident Analysis',                       description: 'Investigations conducted to ensure effective response and support forensics and recovery activities',               category: 'Respond' },
    { control_id: 'NIST-RC.RP', name: 'Incident Recovery Plan Execution',        description: 'Restoration activities performed to ensure operational availability of systems affected by incidents',              category: 'Recover' },
  ],
};

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body: any = await req.json();
  const { framework_id } = body;

  if (!framework_id) return NextResponse.json({ error: 'framework_id is required' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });
  if (!['owner', 'admin'].includes(profile.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check not already added
  const { data: existing } = await supabase
    .from('organisation_frameworks')
    .select('id')
    .eq('organisation_id', profile.organisation_id)
    .eq('framework_id', framework_id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Framework already added to your organisation' }, { status: 400 });

  // Add framework link
  const { data, error } = await supabase
    .from('organisation_frameworks')
    .insert({ organisation_id: profile.organisation_id, framework_id, compliance_score: 0, is_active: true })
    .select('*, framework:compliance_frameworks(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Seed controls using the framework short_name to look up our controls list
  const shortName = data.framework?.short_name as string;
  const controlList = FRAMEWORK_CONTROLS[shortName];

  if (controlList && controlList.length > 0) {
    const controlRows = controlList.map(c => ({
      organisation_id: profile.organisation_id,
      framework_id,
      control_id: c.control_id,
      name: c.name,
      description: c.description,
      category: c.category,
      status: 'not_started',
      evidence_required: true,
    }));

    const { error: controlsError } = await supabase.from('controls').insert(controlRows);
    if (controlsError) {
      // Log but don't fail the whole request
      console.error('Controls seeding error:', controlsError.message);
    }
  }

  await supabase.from('audit_logs').insert({
    organisation_id: profile.organisation_id,
    user_id: user.id,
    action: `added compliance framework: ${shortName || framework_id}`,
    resource_type: 'compliance_framework',
    resource_id: framework_id,
    resource_name: data.framework?.name,
  });

  return NextResponse.json({ data }, { status: 201 });
}
