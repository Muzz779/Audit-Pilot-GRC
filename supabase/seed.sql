-- ============================================================
-- AuditPilot — Demo Seed Data
-- Run AFTER schema.sql to populate demo data
-- ============================================================

-- Create a demo organisation
insert into organisations (id, name, slug, industry, size, country) values
  ('11111111-1111-1111-1111-111111111111', 'Acme Financial Services', 'acme-financial', 'Financial Services', '51-200', 'ZA');

-- Create a subscription for demo org
insert into subscriptions (organisation_id, tier, status, amount_cents, current_period_end) values
  ('11111111-1111-1111-1111-111111111111', 'pro', 'active', 79900, now() + interval '30 days');

-- Link frameworks to demo org
insert into organisation_frameworks (organisation_id, framework_id, compliance_score)
select '11111111-1111-1111-1111-111111111111', id, 
  case short_name
    when 'POPIA' then 72
    when 'ISO 27001' then 58
    when 'SOC 2' then 45
    when 'King IV' then 81
    else 30
  end
from compliance_frameworks 
where short_name in ('POPIA', 'ISO 27001', 'SOC 2', 'King IV');

-- Create demo controls for POPIA
insert into controls (organisation_id, framework_id, control_id, name, description, category, status)
select 
  '11111111-1111-1111-1111-111111111111',
  cf.id,
  ctrl.control_id,
  ctrl.name,
  ctrl.description,
  ctrl.category,
  ctrl.status::control_status
from compliance_frameworks cf
cross join (values
  ('POPIA-1', 'Accountability', 'Designate an Information Officer responsible for compliance', 'Governance', 'implemented'),
  ('POPIA-2', 'Processing Limitation', 'Ensure personal information is processed lawfully and minimally', 'Data Processing', 'implemented'),
  ('POPIA-3', 'Purpose Specification', 'Collect personal information for specific, defined purposes', 'Data Processing', 'in_progress'),
  ('POPIA-4', 'Further Processing Limitation', 'Ensure further processing is compatible with original purpose', 'Data Processing', 'not_started'),
  ('POPIA-5', 'Information Quality', 'Maintain accurate and complete personal information', 'Data Quality', 'in_progress'),
  ('POPIA-6', 'Openness', 'Maintain documentation of all processing activities', 'Transparency', 'implemented'),
  ('POPIA-7', 'Security Safeguards', 'Implement appropriate technical and organisational security measures', 'Security', 'in_progress'),
  ('POPIA-8', 'Data Subject Participation', 'Allow data subjects to access and correct their information', 'Rights', 'not_started')
) as ctrl(control_id, name, description, category, status)
where cf.short_name = 'POPIA';

-- Create demo risks
insert into risks (organisation_id, title, description, category, likelihood, impact, status, mitigation_plan) values
  ('11111111-1111-1111-1111-111111111111', 'Data Breach via Phishing', 'Employees may fall victim to phishing attacks compromising credentials and sensitive data', 'Cybersecurity', 'likely', 'major', 'mitigating', 'Implement mandatory security awareness training, deploy advanced email filtering, and enable MFA for all accounts'),
  ('11111111-1111-1111-1111-111111111111', 'POPIA Non-Compliance Penalty', 'Failure to meet POPIA requirements could result in fines up to R10M or 10 years imprisonment', 'Compliance', 'possible', 'catastrophic', 'identified', 'Conduct POPIA gap assessment, appoint Information Officer, implement data mapping'),
  ('11111111-1111-1111-1111-111111111111', 'Ransomware Attack', 'Critical systems encrypted making operations impossible', 'Cybersecurity', 'unlikely', 'catastrophic', 'mitigating', 'Implement offline backups, network segmentation, and incident response plan'),
  ('11111111-1111-1111-1111-111111111111', 'Third Party Vendor Risk', 'Vendors with access to systems may introduce vulnerabilities', 'Third Party', 'possible', 'major', 'assessed', 'Implement vendor risk assessment programme and contractual security requirements'),
  ('11111111-1111-1111-1111-111111111111', 'Insider Threat', 'Employees with access to sensitive data may misuse it', 'People', 'unlikely', 'major', 'identified', 'Implement access controls, monitoring, and separation of duties'),
  ('11111111-1111-1111-1111-111111111111', 'Business Continuity Failure', 'Major disaster causing extended operational downtime', 'Operational', 'rare', 'major', 'assessed', 'Develop and test business continuity and disaster recovery plans');

-- Create demo policies
insert into policies (organisation_id, title, description, category, status, current_version) values
  ('11111111-1111-1111-1111-111111111111', 'Information Security Policy', 'Core policy governing the protection of information assets across the organisation', 'Security', 'approved', 1),
  ('11111111-1111-1111-1111-111111111111', 'Data Protection and Privacy Policy', 'Policy governing the collection, processing and storage of personal information in accordance with POPIA', 'Privacy', 'approved', 2),
  ('11111111-1111-1111-1111-111111111111', 'Acceptable Use Policy', 'Guidelines for acceptable use of company IT resources and systems', 'IT', 'approved', 1),
  ('11111111-1111-1111-1111-111111111111', 'AI Usage Policy', 'Policy governing the use of artificial intelligence tools within the organisation', 'Technology', 'draft', 1),
  ('11111111-1111-1111-1111-111111111111', 'Incident Response Policy', 'Procedures for detecting, responding to, and recovering from security incidents', 'Security', 'review', 1),
  ('11111111-1111-1111-1111-111111111111', 'Remote Work Security Policy', 'Security requirements for employees working remotely', 'Security', 'approved', 1);

-- Create a demo audit
insert into audits (organisation_id, framework_id, title, description, status, start_date, end_date)
select 
  '11111111-1111-1111-1111-111111111111',
  cf.id,
  'Annual POPIA Compliance Audit',
  'Annual assessment of compliance with the Protection of Personal Information Act',
  'in_progress',
  current_date,
  current_date + interval '30 days'
from compliance_frameworks cf where cf.short_name = 'POPIA';
