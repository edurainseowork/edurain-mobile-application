import LegalDocument from './LegalDocument';
import { PRIVACY_DOC } from '../../constants/legalContent';

export default function PrivacyScreen() {
  return <LegalDocument doc={PRIVACY_DOC} headerTitle="Privacy Policy" />;
}
