/**
 * CURRICULUM: glossary of terms surfaced in inspect text and debriefs.
 * Definitions are aligned with SY0-701 terminology.
 */
export const GLOSSARY: Record<string, string> = {
  'least privilege':
    'Users and processes get only the minimum access needed for their job function — nothing more.',
  'insider threat':
    'A person with authorized access who misuses it, intentionally or not. Indicators include after-hours access, mass downloads, and unauthorized removable media.',
  'malware':
    'Malicious software: viruses, worms, trojans, ransomware, spyware. Indicators include unexpected processes, pop-ups, encrypted files, and unusual network traffic.',
  'worm':
    'Self-replicating malware that spreads across the network without attaching to a host file or needing user action.',
  'trojan':
    'Malware disguised as legitimate software; it does not self-replicate — the user is tricked into running it.',
  'ransomware':
    'Malware that encrypts a victim\u2019s files and demands payment for the decryption key.',
  'antimalware':
    'Endpoint protection software that detects, quarantines, and removes malicious software — kept effective via updated definitions.',
  'removable media':
    'USB drives and similar devices. Unknown media is a classic malware/exfiltration vector — never plug in found drives.',
  'access control':
    'Policies and mechanisms (badge systems, ACLs, RBAC) that determine who may access which resources.',
  'principle of least privilege':
    'Grant the minimum rights required; requesting access you don\u2019t need is itself a policy violation.',
  'shared credentials':
    'Passwords used by more than one person. They destroy accountability — never accept or use them.',
  'phishing':
    'Fraudulent messages that impersonate a trusted party to steal credentials or deliver malware.',
  'endpoint hardening':
    'Reducing attack surface on hosts: patching, disabling unneeded services, host firewalls, and antimalware.',
  'patching':
    'Applying vendor updates to close known vulnerabilities — a core hardening and vulnerability-management activity.',
  'indicators of compromise':
    'Observable artifacts suggesting malicious activity: unusual logins, data staging, unexpected processes, encrypted files.',
};
