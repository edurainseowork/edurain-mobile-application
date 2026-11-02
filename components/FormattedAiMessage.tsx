import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../constants/theme';

interface FormattedAiMessageProps {
  content: string;
}

export function FormattedAiMessage({ content }: FormattedAiMessageProps) {
  if (!content) return null;

  // Split into blocks by double newlines or headers
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inFormulaBlock = false;
  let formulaBuffer: string[] = [];

  const renderFormattedInlineText = (rawText: string, baseStyle?: any) => {
    // Replace inline LaTeX tokens $...$ and **bold**
    const parts = rawText.split(/(\*\*.*?\*\*|\$.*?\$)/g);

    return (
      <Text style={[styles.inlineBaseText, baseStyle]}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={pIdx} style={styles.boldText}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          if (part.startsWith('$') && part.endsWith('$')) {
            const mathToken = part.slice(1, -1);
            return (
              <Text key={pIdx} style={styles.mathInlinePill}>
                {cleanMathSymbols(mathToken)}
              </Text>
            );
          }
          return <Text key={pIdx}>{part}</Text>;
        })}
      </Text>
    );
  };

  const cleanMathSymbols = (str: string) => {
    return str
      .replace(/\\vec\{(\w+)\}/g, '$1⃗')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\theta/g, 'θ')
      .replace(/\\Phi/g, 'Φ')
      .replace(/\\pi/g, 'π')
      .replace(/\\mu/g, 'μ')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\lambda/g, 'λ')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '•')
      .replace(/\\approx/g, '≈')
      .replace(/\\neq/g, '≠')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\int/g, '∫')
      .replace(/\\sum/g, '∑')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\circ/g, '°');
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) continue;

    // Check Block Math $$.*$$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
      const mathContent = cleanMathSymbols(trimmed.slice(2, -2).trim());
      elements.push(
        <View key={`math_${i}`} style={styles.formulaBox}>
          <View style={styles.formulaHeader}>
            <MaterialCommunityIcons name="function-variant" size={14} color="#38BDF8" />
            <Text style={styles.formulaLabel}>FORMULA / EQUATION</Text>
          </View>
          <Text style={styles.formulaText}>{mathContent}</Text>
        </View>
      );
      continue;
    }

    if (trimmed === '$$') {
      if (inFormulaBlock) {
        // End formula block
        const formulaStr = cleanMathSymbols(formulaBuffer.join('\n'));
        elements.push(
          <View key={`math_block_${i}`} style={styles.formulaBox}>
            <View style={styles.formulaHeader}>
              <MaterialCommunityIcons name="function-variant" size={14} color="#38BDF8" />
              <Text style={styles.formulaLabel}>FORMULA / EQUATION</Text>
            </View>
            <Text style={styles.formulaText}>{formulaStr}</Text>
          </View>
        );
        formulaBuffer = [];
        inFormulaBlock = false;
      } else {
        inFormulaBlock = true;
      }
      continue;
    }

    if (inFormulaBlock) {
      formulaBuffer.push(trimmed);
      continue;
    }

    // Check Headers: ### 1. Quick Concept Overview, etc.
    if (trimmed.startsWith('###')) {
      const headerText = trimmed.replace(/^###\s*/, '').trim();
      let icon = <Feather name="book-open" size={14} color="#0D9488" />;
      let badgeStyle = styles.conceptBadge;
      let badgeTextStyle = styles.conceptBadgeText;

      if (headerText.toLowerCase().includes('formula')) {
        icon = <MaterialCommunityIcons name="sigma" size={15} color="#0284C7" />;
        badgeStyle = styles.formulaBadge;
        badgeTextStyle = styles.formulaBadgeText;
      } else if (headerText.toLowerCase().includes('derivation') || headerText.toLowerCase().includes('solution')) {
        icon = <Feather name="edit-3" size={14} color="#7C3AED" />;
        badgeStyle = styles.stepsBadge;
        badgeTextStyle = styles.stepsBadgeText;
      } else if (headerText.toLowerCase().includes('pro-tip') || headerText.toLowerCase().includes('tip')) {
        icon = <Feather name="award" size={14} color="#D97706" />;
        badgeStyle = styles.tipBadge;
        badgeTextStyle = styles.tipBadgeText;
      }

      elements.push(
        <View key={`header_${i}`} style={[styles.sectionHeaderWrap, badgeStyle]}>
          {icon}
          <Text style={[styles.sectionHeaderText, badgeTextStyle]}>{headerText}</Text>
        </View>
      );
      continue;
    }

    // Check bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <View key={`bullet_${i}`} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <View style={styles.bulletTextWrap}>
            {renderFormattedInlineText(trimmed.slice(2))}
          </View>
        </View>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <View key={`p_${i}`} style={styles.paragraphWrap}>
        {renderFormattedInlineText(trimmed)}
      </View>
    );
  }

  return <View style={styles.container}>{elements}</View>;
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  inlineBaseText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
    lineHeight: 20,
  },
  boldText: {
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  mathInlinePill: {
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  paragraphWrap: {
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingLeft: 4,
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0D9488',
    lineHeight: 20,
  },
  bulletTextWrap: {
    flex: 1,
  },

  /* Section Header Badges */
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 2,
    gap: 6,
    alignSelf: 'flex-start',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    letterSpacing: 0.3,
  },
  conceptBadge: {
    backgroundColor: '#CCFBF1',
  },
  conceptBadgeText: {
    color: '#0F766E',
  },
  formulaBadge: {
    backgroundColor: '#E0F2FE',
  },
  formulaBadgeText: {
    color: '#0369A1',
  },
  stepsBadge: {
    backgroundColor: '#F3E8FF',
  },
  stepsBadgeText: {
    color: '#6D28D9',
  },
  tipBadge: {
    backgroundColor: '#FEF3C7',
  },
  tipBadgeText: {
    color: '#B45309',
  },

  /* Mathematical Formula Block */
  formulaBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  formulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 4,
  },
  formulaLabel: {
    fontSize: 9.5,
    fontFamily: Theme.fonts.bold,
    color: '#38BDF8',
    letterSpacing: 1,
  },
  formulaText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#38BDF8',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
});

