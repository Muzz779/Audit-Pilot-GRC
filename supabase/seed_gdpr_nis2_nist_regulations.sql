-- ============================================================
-- AuditPilot — GDPR, NIS2 and NIST CSF 2.0 knowledge base seed
-- ============================================================
--
-- READ BEFORE RELYING ON THIS DATA
--
-- These rows summarise the public text of:
--   * GDPR: Regulation (EU) 2016/679
--   * NIS2: Directive (EU) 2022/2555
--   * NIST Cybersecurity Framework 2.0 (NIST CSWP 29, February 2024)
-- They were drafted with AI from those official texts, like the POPIA seed.
-- They are NOT legal advice and have NOT been reviewed by a qualified
-- professional. Every row is inserted with is_verified = false, so the app
-- shows its "unverified" warning wherever they are used. Flip is_verified only
-- after a qualified professional has checked each row against the official text.
--
-- NIS2 is a directive: what binds a company is each EU member state's own law
-- that implements it, so the details can differ by country.
--
-- ISO 27001, SOC 2, PCI DSS and King IV are deliberately NOT here: their text is
-- owned by ISO, AICPA, the PCI Security Standards Council and the IoDSA, and needs
-- a licence before it can be loaded.
--
-- Safe to run more than once: it replaces the rows for these three frameworks.
-- Embeddings are left NULL; run `npm run embed-regulations` afterwards.
-- ============================================================

begin;

-- POPIA rows were labelled just "Section 8" etc. With other laws in the same
-- search, citations need to say which law they come from.
update regulation_chunks
set section_reference = 'POPIA ' || section_reference
where framework_id = (select id from compliance_frameworks where short_name = 'POPIA')
  and section_reference not like 'POPIA %';

delete from regulation_chunks
where framework_id in (select id from compliance_frameworks where short_name in ('GDPR', 'NIS2', 'NIST CSF'));

-- ── GDPR ─────────────────────────────────────────────────────────────────────
insert into regulation_chunks
  (framework_id, section_reference, title, chunk_text, category, required_evidence_description, is_verified)
select f.id, v.section_reference, v.title, v.chunk_text, v.category, v.required_evidence_description, false
from compliance_frameworks f
cross join (values
  (
    'GDPR Article 3',
    'Territorial Scope',
    'The GDPR applies to processing of personal data in the context of the activities of an establishment of a controller or processor in the European Union, whether or not the processing takes place in the Union. It also applies to a controller or processor not established in the Union, such as a South African company, where the processing relates to offering goods or services to data subjects in the Union, whether or not payment is required, or to monitoring their behaviour as far as that behaviour takes place in the Union. Under Article 27 such a controller or processor must, with limited exceptions, designate in writing a representative in the Union.',
    'Scope',
    'A documented assessment of whether the organisation offers goods or services to, or monitors, people in the EU, and where it does, the written appointment of an EU representative.'
  ),
  (
    'GDPR Article 5',
    'Principles Relating to Processing of Personal Data',
    'Personal data must be: processed lawfully, fairly and in a transparent manner; collected for specified, explicit and legitimate purposes and not further processed in a manner incompatible with those purposes (purpose limitation); adequate, relevant and limited to what is necessary (data minimisation); accurate and, where necessary, kept up to date; kept in a form which permits identification of data subjects for no longer than is necessary (storage limitation); and processed in a manner that ensures appropriate security, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage (integrity and confidentiality). Under Article 5(2) the controller is responsible for, and must be able to demonstrate, compliance with these principles (accountability).',
    'Principles',
    'A data protection policy that addresses each principle, a data inventory showing purposes and fields collected, a retention schedule, and records that demonstrate compliance (accountability).'
  ),
  (
    'GDPR Article 6',
    'Lawfulness of Processing',
    'Processing is lawful only if and to the extent that at least one of the following applies: the data subject has given consent for one or more specific purposes; processing is necessary for the performance of a contract with the data subject or to take steps at their request before entering into a contract; processing is necessary for compliance with a legal obligation of the controller; processing is necessary to protect the vital interests of the data subject or another natural person; processing is necessary for a task carried out in the public interest or in the exercise of official authority; or processing is necessary for the legitimate interests of the controller or a third party, except where overridden by the interests or fundamental rights and freedoms of the data subject.',
    'Lawful Basis',
    'A register or record of processing that names the lawful basis for each processing activity, and a documented legitimate interests assessment wherever legitimate interests is relied on.'
  ),
  (
    'GDPR Article 7',
    'Conditions for Consent',
    'Where processing is based on consent, the controller must be able to demonstrate that the data subject consented. A written request for consent that also covers other matters must be clearly distinguishable, in an intelligible and easily accessible form, using clear and plain language. The data subject has the right to withdraw consent at any time, must be told this before giving consent, and withdrawing must be as easy as giving consent. When assessing whether consent is freely given, utmost account is taken of whether performance of a contract is made conditional on consent that is not necessary for that contract. Article 4(11) defines consent as a freely given, specific, informed and unambiguous indication of wishes, by a statement or clear affirmative action.',
    'Consent',
    'Consent wording and capture records (who consented, when, to what, and how), and a documented, easy way to withdraw consent that is actually honoured.'
  ),
  (
    'GDPR Articles 12-14',
    'Transparency and Information to Data Subjects (Privacy Notices)',
    'Information must be given in a concise, transparent, intelligible and easily accessible form, using clear and plain language (Article 12). Where personal data are collected from the data subject, at the time of collection the controller must provide (Article 13): its identity and contact details; the contact details of any data protection officer; the purposes and the legal basis of processing; the legitimate interests pursued, where relied on; the recipients or categories of recipients; any transfer to a third country and the safeguards used; the retention period or the criteria used to set it; the data subject rights, including the right to withdraw consent and to lodge a complaint with a supervisory authority; whether providing the data is a statutory or contractual requirement; and the existence of automated decision-making, including profiling. Where data are not obtained from the data subject (Article 14), similar information, including the source of the data, must be given within a reasonable period and at the latest within one month.',
    'Transparency',
    'Published privacy notices covering every required item, and evidence of when and where they are shown to people (for example at sign-up or on forms).'
  ),
  (
    'GDPR Article 17',
    'Right to Erasure (Right to be Forgotten)',
    'The data subject has the right to obtain from the controller the erasure of personal data concerning them without undue delay where, among other grounds: the data are no longer necessary for the purposes for which they were collected; consent is withdrawn and there is no other legal ground; the data subject objects and there are no overriding legitimate grounds; the data have been unlawfully processed; or erasure is needed to comply with a legal obligation. Where the controller has made the data public it must take reasonable steps to inform other controllers processing them. The right does not apply to the extent processing is necessary for, among other things, freedom of expression, compliance with a legal obligation, public health, archiving or research purposes, or the establishment, exercise or defence of legal claims. Under Article 12(3) the controller must respond within one month, extendable by two further months where necessary.',
    'Data Subject Rights',
    'A documented procedure for receiving, verifying and completing erasure requests within one month, and a log of requests received and how each was handled.'
  ),
  (
    'GDPR Article 20',
    'Right to Data Portability',
    'The data subject has the right to receive the personal data concerning them, which they have provided to a controller, in a structured, commonly used and machine-readable format, and to transmit those data to another controller without hindrance, where the processing is based on consent or on a contract and is carried out by automated means. Where technically feasible, the data subject has the right to have the data transmitted directly from one controller to another. The right must not adversely affect the rights and freedoms of others.',
    'Data Subject Rights',
    'A documented procedure for portability requests and evidence that data can be exported in a structured, machine-readable format such as CSV or JSON.'
  ),
  (
    'GDPR Article 25',
    'Data Protection by Design and by Default',
    'Taking into account the state of the art, the cost of implementation, the nature, scope, context and purposes of processing, and the risks to individuals, the controller must, both when determining the means of processing and at the time of processing itself, implement appropriate technical and organisational measures, such as pseudonymisation, designed to implement the data protection principles, such as data minimisation, effectively. By default, only personal data necessary for each specific purpose may be processed. This applies to the amount of data collected, the extent of processing, the period of storage and accessibility; in particular, personal data must not by default be made accessible to an indefinite number of people without the individual''s intervention.',
    'By Design',
    'Evidence that privacy is considered when systems are designed or changed, for example a privacy review step in the development or procurement process, and privacy-protective default settings.'
  ),
  (
    'GDPR Article 28',
    'Processors and Data Processing Agreements',
    'A controller may only use processors that provide sufficient guarantees to implement appropriate technical and organisational measures. Processing by a processor must be governed by a binding contract that sets out the subject matter and duration, the nature and purpose of processing, the type of personal data and categories of data subjects, and the obligations and rights of the controller. The contract must require the processor to: process only on documented instructions, including for international transfers; ensure people authorised to process the data are bound by confidentiality; take all measures required by Article 32; engage sub-processors only with the controller''s prior written authorisation and on the same terms; assist the controller with data subject requests and with Articles 32 to 36; delete or return all personal data at the end of the services; and make available all information needed to demonstrate compliance and allow for and contribute to audits and inspections.',
    'Third Parties',
    'Signed data processing agreements with every processor that contain the Article 28 clauses, and a list of processors and sub-processors.'
  ),
  (
    'GDPR Article 30',
    'Records of Processing Activities',
    'Each controller must maintain a written record, which may be electronic, of processing activities under its responsibility, containing: the name and contact details of the controller and, where applicable, any joint controller, representative and data protection officer; the purposes of the processing; the categories of data subjects and of personal data; the categories of recipients; transfers to third countries and the safeguards used; where possible, the envisaged time limits for erasure of the different categories of data; and where possible, a general description of the technical and organisational security measures. Processors must keep a corresponding record. The record must be made available to the supervisory authority on request. Organisations with fewer than 250 employees are exempt unless the processing is likely to result in a risk to individuals, is not occasional, or includes special categories of data or data relating to criminal convictions.',
    'Documentation',
    'A record of processing activities (ROPA) containing each required field, kept up to date.'
  ),
  (
    'GDPR Article 32',
    'Security of Processing',
    'Taking into account the state of the art, the costs of implementation, the nature, scope, context and purposes of processing, and the risk to individuals, the controller and the processor must implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including as appropriate: the pseudonymisation and encryption of personal data; the ability to ensure the ongoing confidentiality, integrity, availability and resilience of processing systems and services; the ability to restore the availability of and access to personal data in a timely manner in the event of a physical or technical incident; and a process for regularly testing, assessing and evaluating the effectiveness of these measures.',
    'Security',
    'An information security policy, evidence of encryption and access controls, backup and restore testing records, and results of regular security testing such as vulnerability scans or penetration tests.'
  ),
  (
    'GDPR Articles 33-34',
    'Personal Data Breach Notification',
    'In the case of a personal data breach, the controller must without undue delay and, where feasible, not later than 72 hours after becoming aware of it, notify the competent supervisory authority, unless the breach is unlikely to result in a risk to the rights and freedoms of individuals. A notification made after 72 hours must give reasons for the delay. A processor must notify the controller without undue delay after becoming aware of a breach. The notification must describe the nature of the breach including, where possible, the categories and approximate number of data subjects and records concerned; give the contact point; describe the likely consequences; and describe the measures taken or proposed. The controller must document every breach, including its facts, effects and remedial action. Where a breach is likely to result in a high risk to individuals, the controller must also communicate it to the affected data subjects without undue delay (Article 34).',
    'Breach Response',
    'An incident or breach response procedure with the 72-hour notification step and named responsibilities, and a breach register recording every breach, including ones not reported.'
  ),
  (
    'GDPR Article 35',
    'Data Protection Impact Assessment',
    'Where a type of processing, in particular using new technologies, is likely to result in a high risk to the rights and freedoms of individuals, the controller must carry out a data protection impact assessment before the processing. It is required in particular for: systematic and extensive evaluation of personal aspects based on automated processing, including profiling, on which decisions with legal or similarly significant effects are based; processing on a large scale of special categories of data or of data relating to criminal convictions and offences; and systematic monitoring of a publicly accessible area on a large scale. The assessment must contain at least a systematic description of the processing and its purposes, an assessment of necessity and proportionality, an assessment of the risks to individuals, and the measures to address those risks. The advice of the data protection officer, where designated, must be sought. Where high risk remains, the supervisory authority must be consulted before processing (Article 36).',
    'Risk Assessment',
    'A DPIA procedure that says when an assessment is required, and completed DPIAs for high-risk processing activities.'
  )
) as v(section_reference, title, chunk_text, category, required_evidence_description)
where f.short_name = 'GDPR';

-- ── NIS2 ─────────────────────────────────────────────────────────────────────
insert into regulation_chunks
  (framework_id, section_reference, title, chunk_text, category, required_evidence_description, is_verified)
select f.id, v.section_reference, v.title, v.chunk_text, v.category, v.required_evidence_description, false
from compliance_frameworks f
cross join (values
  (
    'NIS2 Articles 2-3',
    'Scope: Essential and Important Entities',
    'NIS2 applies to public and private entities of a type listed in Annex I (sectors of high criticality, such as energy, transport, banking, financial market infrastructure, health, drinking water, digital infrastructure, ICT service management and public administration) or Annex II (other critical sectors, such as postal services, waste management, chemicals, food, manufacturing, digital providers and research) that qualify as medium-sized enterprises or exceed that size, and that provide their services or carry out their activities in the European Union. Some entities are covered regardless of size. Covered entities are classed as essential or important, which affects supervision and penalties. NIS2 is a directive: the binding obligations are set by each member state''s national law that implements it. An entity not established in the Union that offers covered services there may need to designate a representative in the Union (Article 26).',
    'Scope',
    'A documented assessment of whether the organisation provides services in the EU in an Annex I or Annex II sector, its size classification, and which member state laws apply.'
  ),
  (
    'NIS2 Article 20',
    'Governance and Management Body Accountability',
    'Member states must ensure that the management bodies of essential and important entities approve the cybersecurity risk-management measures taken to comply with Article 21, oversee their implementation, and can be held liable for infringements by the entity. Members of the management bodies must follow training, and entities are encouraged to offer similar training to their employees on a regular basis, so that they gain sufficient knowledge and skills to identify risks and assess cybersecurity risk-management practices and their impact on the services the entity provides.',
    'Governance',
    'Board or management minutes approving the cybersecurity risk-management measures, evidence of management oversight, and records of cybersecurity training completed by management.'
  ),
  (
    'NIS2 Article 21(1)',
    'Cybersecurity Risk-Management Measures',
    'Essential and important entities must take appropriate and proportionate technical, operational and organisational measures to manage the risks posed to the security of the network and information systems they use for their operations or to provide their services, and to prevent or minimise the impact of incidents on recipients of their services and on other services. Taking into account the state of the art, relevant European and international standards and the cost of implementation, the measures must ensure a level of security appropriate to the risks posed. In assessing proportionality, account is taken of the entity''s exposure to risk, its size, and the likelihood and severity of incidents, including their societal and economic impact. The measures must be based on an all-hazards approach.',
    'Risk Management',
    'A cybersecurity risk-management framework or policy, a current risk assessment, and a treatment plan showing the measures chosen and why they are proportionate.'
  ),
  (
    'NIS2 Article 21(2)(a)',
    'Risk Analysis and Information System Security Policies',
    'The cybersecurity risk-management measures must include at least policies on risk analysis and information system security.',
    'Risk Management',
    'Approved, current policies on risk analysis and information system security, with a review date and owner.'
  ),
  (
    'NIS2 Article 21(2)(b) and (f)',
    'Incident Handling and Assessing Effectiveness',
    'The measures must include at least incident handling, meaning the processes for detecting, analysing, containing and responding to incidents and recovering from them, and policies and procedures to assess the effectiveness of cybersecurity risk-management measures.',
    'Incident Response',
    'An incident handling procedure, records of incidents handled, and evidence that the effectiveness of security measures is assessed, for example internal audits, tests or metrics.'
  ),
  (
    'NIS2 Article 21(2)(c)',
    'Business Continuity, Backup and Crisis Management',
    'The measures must include at least business continuity, such as backup management and disaster recovery, and crisis management.',
    'Business Continuity',
    'A business continuity and disaster recovery plan, backup policy and backup restore test results, and a crisis management procedure.'
  ),
  (
    'NIS2 Article 21(2)(d) and 21(3)',
    'Supply Chain Security',
    'The measures must include at least supply chain security, including security-related aspects concerning the relationships between each entity and its direct suppliers or service providers. When considering which measures are appropriate, entities must take into account the vulnerabilities specific to each direct supplier and service provider, and the overall quality of their products and cybersecurity practices, including their secure development procedures.',
    'Supply Chain',
    'A supplier security assessment process, a register of direct suppliers with their risk rating, and security requirements in supplier contracts.'
  ),
  (
    'NIS2 Article 21(2)(e)',
    'Security in Acquisition, Development and Maintenance',
    'The measures must include at least security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure.',
    'Development',
    'A secure development or procurement policy, a vulnerability management procedure with patching timelines, and a vulnerability disclosure process.'
  ),
  (
    'NIS2 Article 21(2)(g)',
    'Basic Cyber Hygiene Practices and Cybersecurity Training',
    'The measures must include at least basic cyber hygiene practices and cybersecurity training.',
    'Hygiene',
    'Cyber hygiene standards (for example patching, secure configuration and password rules) and records of staff cybersecurity training and attendance.'
  ),
  (
    'NIS2 Article 21(2)(h)',
    'Cryptography and Encryption',
    'The measures must include at least policies and procedures regarding the use of cryptography and, where appropriate, encryption.',
    'Cryptography',
    'A cryptography or encryption policy, and evidence of encryption of data at rest and in transit, including key management.'
  ),
  (
    'NIS2 Article 21(2)(i)',
    'Human Resources Security, Access Control and Asset Management',
    'The measures must include at least human resources security, access control policies and asset management.',
    'HR Security',
    'Joiner, mover and leaver procedures, an access control policy with access reviews, and an up-to-date asset inventory.'
  ),
  (
    'NIS2 Article 21(2)(j)',
    'Multi-Factor Authentication and Secured Communications',
    'The measures must include at least the use of multi-factor authentication or continuous authentication solutions, secured voice, video and text communications, and secured emergency communication systems within the entity, where appropriate.',
    'Access Control',
    'Evidence that multi-factor authentication is enforced on relevant systems, and the tools and arrangements used for secured and emergency communications.'
  ),
  (
    'NIS2 Article 23',
    'Reporting of Significant Incidents',
    'Essential and important entities must notify their CSIRT or competent authority, without undue delay, of any significant incident. An incident is significant if it has caused or is capable of causing severe operational disruption of the services or financial loss for the entity, or has affected or is capable of affecting other natural or legal persons by causing considerable material or non-material damage. Entities must submit: an early warning without undue delay and in any event within 24 hours of becoming aware of the significant incident, indicating whether it is suspected of being caused by unlawful or malicious acts or could have a cross-border impact; an incident notification without undue delay and in any event within 72 hours, giving an initial assessment including its severity and impact and, where available, indicators of compromise; an intermediate report on request; and a final report not later than one month after the incident notification, including a detailed description, the type of threat or root cause, the mitigation measures applied and any cross-border impact. Where appropriate, entities must also notify the recipients of their services without undue delay.',
    'Reporting',
    'An incident reporting procedure with the 24-hour, 72-hour and one-month steps, the CSIRT or authority contact details, and records of notifications made.'
  )
) as v(section_reference, title, chunk_text, category, required_evidence_description)
where f.short_name = 'NIS2';

-- ── NIST CSF 2.0 ─────────────────────────────────────────────────────────────
-- Category outcomes are taken from the CSF 2.0 Core (a US government work).
insert into regulation_chunks
  (framework_id, section_reference, title, chunk_text, category, required_evidence_description, is_verified)
select f.id, v.section_reference, v.title, v.chunk_text, v.category, v.required_evidence_description, false
from compliance_frameworks f
cross join (values
  (
    'NIST CSF 2.0 GV.OC',
    'Govern: Organizational Context',
    'The circumstances (mission, stakeholder expectations, dependencies, and legal, regulatory, and contractual requirements) surrounding the organization''s cybersecurity risk management decisions are understood. This includes understanding the organizational mission, internal and external stakeholders and their expectations, the legal, regulatory and contractual cybersecurity requirements, and the critical objectives, capabilities, services and dependencies the organization relies on or that rely on it.',
    'Govern',
    'A documented statement of the organisation''s mission and critical services, a register of legal, regulatory and contractual cybersecurity requirements, and a list of key dependencies.'
  ),
  (
    'NIST CSF 2.0 GV.RM',
    'Govern: Risk Management Strategy',
    'The organization''s priorities, constraints, risk tolerance and appetite statements, and assumptions are established, communicated, and used to support operational risk decisions. Risk management objectives are agreed by stakeholders, cybersecurity risk management is included in enterprise risk management, and a standardized method for calculating, documenting, categorizing and prioritizing cybersecurity risks is established.',
    'Govern',
    'An approved cybersecurity risk management strategy, a risk appetite or tolerance statement, and a documented risk methodology.'
  ),
  (
    'NIST CSF 2.0 GV.RR',
    'Govern: Roles, Responsibilities, and Authorities',
    'Cybersecurity roles, responsibilities, and authorities to foster accountability, performance assessment, and continuous improvement are established and communicated. Organizational leadership is responsible and accountable for cybersecurity risk and fosters a risk-aware, ethical and continually improving culture, adequate resources are allocated, and cybersecurity is included in human resources practices.',
    'Govern',
    'A document assigning cybersecurity roles and accountability (for example a RACI or job descriptions), and evidence of leadership ownership of cybersecurity risk.'
  ),
  (
    'NIST CSF 2.0 GV.PO',
    'Govern: Policy',
    'Organizational cybersecurity policy is established, communicated, and enforced. The policy for managing cybersecurity risks is established based on organizational context, cybersecurity strategy and priorities, and is communicated and enforced. It is reviewed, updated, communicated and enforced to reflect changes in requirements, threats, technology and organizational mission.',
    'Govern',
    'An approved cybersecurity policy with a review date, and evidence it has been communicated to staff and is reviewed regularly.'
  ),
  (
    'NIST CSF 2.0 GV.OV',
    'Govern: Oversight',
    'Results of organization-wide cybersecurity risk management activities and performance are used to inform, improve, and adjust the risk management strategy. The strategy outcomes are reviewed to inform and adjust strategy and direction, and organizational cybersecurity risk management performance is evaluated and reviewed for adjustments needed.',
    'Govern',
    'Management or board reports on cybersecurity performance and minutes showing they were reviewed and acted on.'
  ),
  (
    'NIST CSF 2.0 GV.SC',
    'Govern: Cybersecurity Supply Chain Risk Management',
    'Cyber supply chain risk management processes are identified, established, managed, monitored, and improved by organizational stakeholders. This includes a supply chain risk management program and strategy, knowing and prioritizing suppliers by criticality, including cybersecurity requirements in contracts with suppliers, assessing risks before entering formal supplier relationships, monitoring suppliers over the relationship, and planning for the conclusion of supplier relationships.',
    'Govern',
    'A supplier risk management procedure, a supplier register with criticality ratings, supplier security assessments, and security clauses in supplier contracts.'
  ),
  (
    'NIST CSF 2.0 ID.AM',
    'Identify: Asset Management',
    'Assets (for example data, hardware, software, systems, facilities, services and people) that enable the organization to achieve business purposes are identified and managed consistent with their relative importance to organizational objectives and the organization''s risk strategy. This includes maintaining inventories of hardware, software, services and systems, representations of authorized network communication and data flows, inventories of services provided by suppliers, inventories of data and data types, prioritizing assets by classification, criticality and impact, and managing assets throughout their life cycle.',
    'Identify',
    'Current hardware, software and data inventories, a network or data flow diagram, and an asset classification scheme.'
  ),
  (
    'NIST CSF 2.0 ID.RA',
    'Identify: Risk Assessment',
    'The cybersecurity risk to the organization, assets, and individuals is understood by the organization. This includes identifying and recording vulnerabilities in assets, receiving cyber threat intelligence, identifying internal and external threats, identifying the potential impacts and likelihoods of threats exploiting vulnerabilities, using threats, vulnerabilities, likelihoods and impacts to understand inherent risk and prioritize risk responses, and choosing, prioritizing, planning, tracking and communicating risk responses.',
    'Identify',
    'A current cybersecurity risk assessment and risk register with likelihood, impact, owners and treatment decisions, plus vulnerability scan results.'
  ),
  (
    'NIST CSF 2.0 ID.IM',
    'Identify: Improvement',
    'Improvements to organizational cybersecurity risk management processes, procedures and activities are identified across all CSF Functions. Improvements are identified from evaluations, from security tests and exercises, and from the execution of operational processes, and incident response plans and other cybersecurity plans that affect operations are established, communicated, maintained and improved.',
    'Identify',
    'Lessons-learned records, results of tests or exercises, and an improvement plan showing actions taken.'
  ),
  (
    'NIST CSF 2.0 PR.AA',
    'Protect: Identity Management, Authentication, and Access Control',
    'Access to physical and logical assets is limited to authorized users, services, and hardware and managed commensurate with the assessed risk of unauthorized access. This includes managing identities and credentials for authorized users, services and hardware, authenticating users, services and hardware, defining and managing access permissions in line with the principles of least privilege and separation of duties, and managing physical access to assets.',
    'Protect',
    'An access control policy, evidence of multi-factor authentication, periodic access review records, and joiner, mover and leaver records.'
  ),
  (
    'NIST CSF 2.0 PR.AT',
    'Protect: Awareness and Training',
    'The organization''s personnel are provided with cybersecurity awareness and training so that they can perform their cybersecurity-related tasks. Personnel are provided with awareness and training so they possess the knowledge and skills to perform general tasks with cybersecurity risks in mind, and individuals in specialized roles are trained for those roles.',
    'Protect',
    'A security awareness programme, training completion records, and role-specific training for staff with security responsibilities.'
  ),
  (
    'NIST CSF 2.0 PR.DS',
    'Protect: Data Security',
    'Data are managed consistent with the organization''s risk strategy to protect the confidentiality, integrity, and availability of information. This includes protecting the confidentiality, integrity and availability of data at rest, data in transit and data in use, and creating, protecting, maintaining and testing backups of data.',
    'Protect',
    'Evidence of encryption at rest and in transit, a data classification and handling policy, and backup and restore test records.'
  ),
  (
    'NIST CSF 2.0 PR.PS',
    'Protect: Platform Security',
    'The hardware, software (for example firmware, operating systems and applications) and services of physical and virtual platforms are managed consistent with the organization''s risk strategy to protect their confidentiality, integrity, and availability. This includes establishing and applying configuration management practices, maintaining, replacing and removing software and hardware commensurate with risk, generating log records and making them available for continuous monitoring, preventing installation and execution of unauthorized software, and integrating secure software development practices.',
    'Protect',
    'Secure configuration baselines, patch management records, logging configuration, and controls against unauthorised software.'
  ),
  (
    'NIST CSF 2.0 PR.IR',
    'Protect: Technology Infrastructure Resilience',
    'Security architectures are managed with the organization''s risk strategy to protect asset confidentiality, integrity, and availability, and organizational resilience. This includes protecting networks and environments from unauthorized logical access and usage, protecting technology assets from environmental threats, implementing mechanisms to achieve resilience requirements in normal and adverse situations, and maintaining adequate resource capacity.',
    'Protect',
    'Network segmentation or architecture documentation, resilience and redundancy arrangements, and capacity monitoring.'
  ),
  (
    'NIST CSF 2.0 DE.CM',
    'Detect: Continuous Monitoring',
    'Assets are monitored to find anomalies, indicators of compromise, and other potentially adverse events. This includes monitoring networks and network services, the physical environment, personnel activity and technology usage, external service provider activities and services, and computing hardware, software, runtime environments and their data.',
    'Detect',
    'Monitoring tools in place (for example SIEM, endpoint detection or log monitoring), monitoring scope, and alert records.'
  ),
  (
    'NIST CSF 2.0 DE.AE',
    'Detect: Adverse Event Analysis',
    'Anomalies, indicators of compromise, and other potentially adverse events are analyzed to characterize the events and detect cybersecurity incidents. This includes analyzing potentially adverse events to better understand associated activities, correlating information from multiple sources, understanding the estimated impact and scope of adverse events, providing information on adverse events to authorized staff and tools, and declaring incidents when adverse events meet the defined incident criteria.',
    'Detect',
    'An alert triage procedure, defined incident declaration criteria, and records of events analysed.'
  ),
  (
    'NIST CSF 2.0 RS.MA',
    'Respond: Incident Management',
    'Responses to detected cybersecurity incidents are managed. The incident response plan is executed in coordination with relevant third parties once an incident is declared, incident reports are triaged and validated, incidents are categorized and prioritized, incidents are escalated or elevated as needed, and the criteria for initiating incident recovery are applied.',
    'Respond',
    'An approved incident response plan with roles, categories and escalation paths, and records of incidents managed under it.'
  ),
  (
    'NIST CSF 2.0 RS.AN',
    'Respond: Incident Analysis',
    'Investigations are conducted to ensure effective response and support forensics and recovery activities. Analysis is performed to establish what has taken place during an incident and its root cause, actions performed during an investigation are recorded and the records'' integrity and provenance preserved, incident data and metadata are collected and their integrity and provenance preserved, and the incident''s magnitude is estimated and validated.',
    'Respond',
    'Incident investigation reports including root cause, and evidence-handling procedures that preserve integrity.'
  ),
  (
    'NIST CSF 2.0 RS.CO',
    'Respond: Incident Response Reporting and Communication',
    'Response activities are coordinated with internal and external stakeholders as required by laws, regulations, or policies. Internal and external stakeholders are notified of incidents, and information is shared with designated internal and external stakeholders.',
    'Respond',
    'A communication and notification plan naming who must be told and when, including regulators, and records of notifications made.'
  ),
  (
    'NIST CSF 2.0 RS.MI',
    'Respond: Incident Mitigation',
    'Activities are performed to prevent expansion of an event and mitigate its effects. Incidents are contained and incidents are eradicated.',
    'Respond',
    'Containment and eradication procedures, and incident records showing the steps taken.'
  ),
  (
    'NIST CSF 2.0 RC.RP',
    'Recover: Incident Recovery Plan Execution',
    'Restoration activities are performed to ensure operational availability of systems and services affected by cybersecurity incidents. The recovery portion of the incident response plan is executed once initiated, recovery actions are selected, scoped, prioritized and performed, the integrity of backups and other restoration assets is verified before use, critical mission functions and cybersecurity risk management are considered to establish post-incident operational norms, the integrity of restored assets is verified, and the end of incident recovery is declared based on criteria with documentation completed.',
    'Recover',
    'A recovery plan with priorities and recovery time objectives, backup integrity checks, and recovery test or incident recovery records.'
  ),
  (
    'NIST CSF 2.0 RC.CO',
    'Recover: Incident Recovery Communication',
    'Restoration activities are coordinated with internal and external parties. Recovery activities and progress in restoring operational capabilities are communicated to designated internal and external stakeholders, and public updates on incident recovery are shared using approved methods and messaging.',
    'Recover',
    'A recovery communication plan and records of recovery updates given to stakeholders.'
  )
) as v(section_reference, title, chunk_text, category, required_evidence_description)
where f.short_name = 'NIST CSF';

commit;

-- Check: expect GDPR 13, NIS2 13, NIST CSF 22, all unverified, embeddings NULL.
select f.short_name, count(*) as rows, bool_or(r.is_verified) as any_verified, count(r.embedding) as embedded
from regulation_chunks r join compliance_frameworks f on f.id = r.framework_id
group by f.short_name order by f.short_name;
