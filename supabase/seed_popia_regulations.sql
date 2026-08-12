-- ============================================================
-- AuditPilot — POPIA Knowledge Base Seed (Phase 1, Starter Set)
-- ============================================================
--
-- ⚠️  IMPORTANT — READ BEFORE RUNNING IN PRODUCTION  ⚠️
--
-- This seed contains 8 core POPIA sections, drafted from
-- publicly available legislative text (Protection of Personal
-- Information Act 4 of 2013).
--
-- This is NOT legal advice and has NOT been reviewed by
-- qualified legal counsel. Every row is inserted with
-- is_verified = false.
--
-- DO NOT present this data to paying customers as authoritative
-- compliance guidance until a qualified professional has
-- reviewed and approved each entry (flip is_verified to true
-- only after that review, via the admin verification screen).
--
-- This is intentionally a SMALL starter set (8 sections, not
-- the full Act) to prove the retrieval pattern works correctly
-- before expanding coverage.
-- ============================================================

-- Get the POPIA framework id (already seeded in main schema.sql)
do $$
declare
  v_framework_id uuid;
begin
  select id into v_framework_id from compliance_frameworks where short_name = 'POPIA';

  if v_framework_id is null then
    raise exception 'POPIA framework not found — run schema.sql first';
  end if;

  -- Note: embeddings are intentionally left NULL here.
  -- They are populated by running scripts/embed-regulations.ts
  -- after this seed, since embedding requires an API call per row.

  insert into regulation_chunks
    (framework_id, section_reference, title, chunk_text, category, required_evidence_description, is_verified)
  values
    (
      v_framework_id,
      'Section 8',
      'Conditions for Lawful Processing',
      'Personal information must be processed lawfully and in a manner that does not infringe the privacy of the data subject. The responsible party must ensure that all eight conditions for lawful processing set out in Chapter 3 of the Act are met before processing any personal information.',
      'Lawful Processing',
      'A documented data processing policy or privacy policy demonstrating the lawful basis relied upon for each category of personal information processed.',
      false
    ),
    (
      v_framework_id,
      'Section 9',
      'Processing Limitation — Minimality',
      'Personal information may only be processed if, given the purpose for which it is processed, it is adequate, relevant and not excessive. The responsible party must not collect more personal information than is reasonably necessary for the stated purpose.',
      'Data Minimisation',
      'A data inventory or data mapping document showing what personal information is collected and a justification for why each field is necessary.',
      false
    ),
    (
      v_framework_id,
      'Section 11',
      'Consent, Justification and Objection',
      'Personal information may only be processed if the data subject has consented, or processing is necessary to carry out actions for the conclusion or performance of a contract, complies with a legal obligation, protects a legitimate interest of the data subject, is necessary for proper performance of a public law duty, or pursues the legitimate interest of the responsible party or a third party. The data subject may object to processing at any time.',
      'Consent',
      'Records of consent capture (e.g. consent checkboxes, timestamps) or documented justification for an alternative lawful basis, plus a process for handling objections.',
      false
    ),
    (
      v_framework_id,
      'Section 14',
      'Retention and Restriction of Records',
      'Records of personal information must not be retained for longer than is necessary for achieving the purpose for which the information was collected or subsequently processed, unless retention is required or authorised by law, the responsible party reasonably requires the record for lawful purposes related to its functions, retention is required by a contract, or the data subject has consented to the retention.',
      'Retention',
      'A documented records retention and disposal schedule specifying retention periods per category of personal information and evidence of secure disposal practices.',
      false
    ),
    (
      v_framework_id,
      'Section 18',
      'Notification to Data Subject',
      'When personal information is collected, the responsible party must take reasonably practicable steps to ensure the data subject is aware of the information being collected, the purpose, whether the supply is voluntary or mandatory, the consequences of failure to provide it, and the right to access and rectify the information.',
      'Transparency',
      'A privacy notice or collection statement presented to data subjects at or before the point of data collection (e.g. on a website form, onboarding document).',
      false
    ),
    (
      v_framework_id,
      'Section 19',
      'Security Measures on Integrity and Confidentiality of Personal Information',
      'The responsible party must secure the integrity and confidentiality of personal information by taking appropriate, reasonable technical and organisational measures to prevent loss, damage, unauthorised destruction, and unlawful access to or processing of personal information. This includes identifying internal and external risks, establishing and maintaining safeguards, regularly verifying safeguards are effectively implemented, and updating safeguards in response to new risks or deficiencies.',
      'Security Safeguards',
      'A documented information security policy, evidence of technical controls (e.g. encryption, access control configuration), and records of periodic security reviews or penetration testing.',
      false
    ),
    (
      v_framework_id,
      'Section 21',
      'Information Processed by Operator or Person Acting Under Authority',
      'An operator (a third party processing personal information on behalf of a responsible party) must process such information only with the knowledge or authorisation of the responsible party, and must treat it as confidential. The processing must be governed by a written contract between the responsible party and the operator requiring the operator to establish and maintain security measures equivalent to those required of the responsible party.',
      'Third Party / Operator Management',
      'Signed data processing agreements or operator agreements with all third parties that process personal information on the organisation''s behalf, containing confidentiality and security obligations.',
      false
    ),
    (
      v_framework_id,
      'Section 22',
      'Notification of Security Compromises',
      'Where there are reasonable grounds to believe that personal information has been accessed or acquired by an unauthorised person, the responsible party must notify the Information Regulator and, unless specific exceptions apply, the affected data subjects, as soon as reasonably possible after discovery, providing sufficient information to allow data subjects to take protective measures. Notification must be in writing and include a description of the possible consequences, the measures taken or to be taken, and a recommendation on steps the data subject can take.',
      'Breach Notification',
      'A documented incident response or data breach notification procedure including defined roles, notification timelines, and a template or record of any past breach notifications issued.',
      false
    )
  on conflict do nothing;

  raise notice 'Inserted 8 POPIA regulation chunks (unverified, embeddings pending).';
end $$;
