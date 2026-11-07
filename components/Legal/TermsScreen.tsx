import LegalDocument from './LegalDocument';
import { TERMS_DOC } from '../../constants/legalContent';

export default function TermsScreen() {
  return <LegalDocument doc={TERMS_DOC} headerTitle="Terms & Conditions" />;
}
