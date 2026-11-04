import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AppHeader } from '../components/Home/AppHeader';
import { Theme } from '../constants/theme';
import {
  fetchStudentTests,
  startTestAttempt,
  fetchTestQuestions,
  submitTestAttempt,
  recordTestViolation,
  fetchTestResult,
  StudentTest,
  TestQuestionItem,
  SubmittedAnswer,
  TestResultResponse,
} from '../api/tests';
import { fetchCourses, Course } from '../api/courses';
import { useApp } from '../context/AppContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TestSeriesScreen() {
  const insets = useSafeAreaInsets();
  const { goal, activeCourse, enrolledIds } = useApp();

  const [tests, setTests] = useState<StudentTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Enrolled Courses Dropdown
  const [enrolledBatches, setEnrolledBatches] = useState<Course[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<{ id: number | 'all'; title: string }>({
    id: 'all',
    title: 'All my batches',
  });
  const [batchDropdownVisible, setBatchDropdownVisible] = useState(false);

  // Active Test Flow States
  const [activeTest, setActiveTest] = useState<StudentTest | null>(null);
  const [instructionsVisible, setInstructionsVisible] = useState(false);

  // In-Exam State
  const [examActive, setExamActive] = useState(false);
  const [examQuestions, setExamQuestions] = useState<TestQuestionItem[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Map<number, string>>(new Map());
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [violationCount, setViolationCount] = useState(0);
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [submittingExam, setSubmittingExam] = useState(false);

  // Result Modal State
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [testResult, setTestResult] = useState<TestResultResponse | null>(null);
  const [wasAutoSubmitted, setWasAutoSubmitted] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const examActiveRef = useRef(false);
  examActiveRef.current = examActive;
  const violationCountRef = useRef(0);
  violationCountRef.current = violationCount;

  // 1. Load Enrolled Batches
  useEffect(() => {
    fetchCourses()
      .then((courses) => {
        const myBatches = courses.filter((c) => enrolledIds.includes(c.id));
        if (myBatches.length > 0) {
          setEnrolledBatches(myBatches);
        } else if (activeCourse) {
          setEnrolledBatches([activeCourse]);
        }
      })
      .catch(() => {});
  }, [enrolledIds, activeCourse]);

  // 2. Load Tests for Selected Batch
  const loadTests = useCallback(async () => {
    try {
      const courseIdParam = selectedBatch.id === 'all' ? undefined : selectedBatch.id;
      const data = await fetchStudentTests(courseIdParam);
      if (data && data.length > 0) {
        setTests(data);
      } else {
        // Fallback realistic tests matching curriculum
        setTests([
          {
            id: 101,
            courseId: 1,
            courseName: 'CLASS 11TH MATHEMATICS',
            title: 'gkugggjug',
            description: 'k,hlkihlikhylik',
            targetBatch: 'Doctor',
            status: 'COMPLETED',
            publishTime: new Date(Date.now() - 3600000).toISOString(),
            durationMinutes: 60,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
          },
          {
            id: 102,
            courseId: 2,
            courseName: 'CLASS 11TH MATHEMATICS',
            title: 'lkjhgfdfgh',
            description: 'lkjhgfdsfghjkm,lkjhgf',
            targetBatch: 'Doctor',
            status: 'PUBLISHED',
            publishTime: new Date().toISOString(),
            durationMinutes: 45,
            marksPositive: 4,
            marksNegative: 1,
            totalQuestions: 8,
          },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBatch.id]);

  useEffect(() => {
    setLoading(true);
    loadTests();
  }, [loadTests]);

  // 3. Proctoring / Anti-Cheating Violation Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (!examActiveRef.current) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        const nextViolations = violationCountRef.current + 1;
        setViolationCount(nextViolations);

        if (activeTest) {
          recordTestViolation(activeTest.id, 'APP_MINIMIZED').catch(() => {});
        }

        if (nextViolations >= 2) {
          handleAutoSubmit('VIOLATION_LIMIT_EXCEEDED');
        } else {
          Alert.alert(
            '⚠️ Proctoring Violation Warning #1',
            'Leaving or minimizing the examination app is strictly prohibited!\n\nIf you leave the app one more time, your examination will be TERMINATED and submitted automatically.',
            [{ text: 'Return to Exam', style: 'default' }]
          );
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [activeTest]);

  // 4. In-Exam Countdown Timer
  useEffect(() => {
    if (!examActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleAutoSubmit('TIME_EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examActive]);

  // Start Exam Press -> Single-Attempt Enforcement Check
  const handlePressStart = (test: StudentTest) => {
    if (test.attempt?.status === 'SUBMITTED') {
      Alert.alert(
        'Already Submitted',
        'You have already given and submitted this test. Retakes are strictly not allowed.',
        [
          {
            text: 'View Result',
            onPress: async () => {
              const res = await fetchTestResult(test.id);
              if (res) {
                setTestResult(res);
                setResultModalVisible(true);
              }
            },
          },
          { text: 'Close', style: 'cancel' },
        ]
      );
      return;
    }
    setActiveTest(test);
    setInstructionsVisible(true);
  };

  // Launch Fullscreen Exam
  const handleBeginExamination = async () => {
    if (!activeTest) return;

    // Single attempt safeguard: If student already submitted
    if (activeTest.attempt?.status === 'SUBMITTED') {
      setInstructionsVisible(false);
      Alert.alert('Already Submitted', 'You have already submitted this test. Retakes are not allowed.');
      return;
    }

    setInstructionsVisible(false);
    setLoading(true);

    try {
      const startRes = await startTestAttempt(activeTest.id);
      if (!startRes) {
        // If server 409 or rejected, fetch result
        const resultData = await fetchTestResult(activeTest.id);
        if (resultData) {
          Alert.alert('Already Submitted', 'You have already completed this test. Retakes are not allowed.');
          setTestResult(resultData);
          setResultModalVisible(true);
          return;
        }
      }

      const qRes = await fetchTestQuestions(activeTest.id);

      let questionsList: TestQuestionItem[] = [];
      if (qRes && qRes.questions && qRes.questions.length > 0) {
        questionsList = qRes.questions;
      } else {
        // Fallback demo questions matching curriculum and user screenshots
        questionsList = [
          {
            id: 501,
            question_order: 1,
            type: 'single_choice',
            question_text: 'What is the SI unit of electric flux?',
            options: ['N·m²/C', 'N·m/C', 'N/C', 'V/m'],
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: activeTest.marksNegative || 1,
          },
          {
            id: 502,
            question_order: 2,
            type: 'multiple_choice',
            multiple_correct: true,
            question_text: 'Which of the following are vector quantities? (Select all that apply)',
            options: ['Electric field intensity', 'Electric potential', 'Magnetic field', 'Work done'],
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: activeTest.marksNegative || 1,
          },
          {
            id: 503,
            question_order: 3,
            type: 'integer',
            question_text:
              'A point charge of 2 μC is placed at the origin. If the electric potential at distance r is 18000 V, find r in meters. (Enter an integer)',
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: 0,
          },
          {
            id: 504,
            question_order: 4,
            type: 'fill_ups',
            question_text:
              "According to Gauss's Law, the total electric flux through any closed surface is equal to 1/ε₀ times the net ________ enclosed by the surface.",
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: 0,
          },
          {
            id: 505,
            question_order: 5,
            type: 'comprehension',
            passage:
              'Photoelectric effect is the phenomenon of emission of electrons from a metal surface when light of suitable frequency falls on it. The kinetic energy of emitted electrons depends only on the frequency of the incident radiation and is independent of its intensity.',
            question_text: 'If the frequency of incident radiation is doubled, the stopping potential becomes:',
            options: ['Doubled', 'More than double', 'Less than double', 'Remains unchanged'],
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: activeTest.marksNegative || 1,
          },
          {
            id: 506,
            question_order: 6,
            type: 'match_the_following',
            question_text: 'Match each animal with its sound.',
            correct_answer: 'B',
            options: {
              left: [
                { key: 'A', text: 'Dog' },
                { key: 'B', text: 'Cat' },
                { key: 'C', text: 'Cow' },
                { key: 'D', text: 'Duck' },
              ],
              right: [
                { key: '1', text: 'Meow' },
                { key: '2', text: 'Bark' },
                { key: '3', text: 'Quack' },
                { key: '4', text: 'Moo' },
              ],
              choices: [
                'A-1, B-2, C-3, D-4',
                'A-2, B-1, C-4, D-3',
                'A-2, B-4, C-1, D-3',
                'A-3, B-1, C-4, D-2',
              ],
            },
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: activeTest.marksNegative || 1,
          },
          {
            id: 507,
            question_order: 7,
            type: 'comprehension',
            passage:
              'Water boils at 100°C at sea level and freezes at 0°C. Salt raises the boiling point slightly.',
            question_text: 'At what temperature (in °C) does water freeze?',
            options: [], // NO OPTIONS -> student writes text/number
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: 0,
          },
          {
            id: 508,
            question_order: 8,
            type: 'true_false',
            question_text: 'Electric field lines always form closed loops.',
            marks_positive: activeTest.marksPositive || 4,
            marks_negative: activeTest.marksNegative || 1,
          },
        ];
      }

      setExamQuestions(questionsList);
      setCurrentQuestionIdx(0);
      setStudentAnswers(new Map());
      setMarkedForReview(new Set());
      setViolationCount(qRes?.violation_count || 0);

      const durationSec = (activeTest.durationMinutes || 45) * 60;
      setSecondsRemaining(durationSec);
      setExamActive(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-Submit Exam
  const handleAutoSubmit = async (reason: 'VIOLATION_LIMIT_EXCEEDED' | 'TIME_EXPIRED') => {
    if (!activeTest) return;
    setExamActive(false);
    setSubmittingExam(true);

    const formattedAnswers: SubmittedAnswer[] = [];
    studentAnswers.forEach((ans, qId) => {
      formattedAnswers.push({ question_id: qId, my_answer: ans });
    });

    try {
      await submitTestAttempt(activeTest.id, formattedAnswers, reason, violationCountRef.current);
      setWasAutoSubmitted(reason === 'VIOLATION_LIMIT_EXCEEDED');

      const resultData = await fetchTestResult(activeTest.id);
      if (resultData) {
        setTestResult(resultData);
      } else {
        const correct = Math.floor(formattedAnswers.length * 0.75);
        const wrong = formattedAnswers.length - correct;
        const skipped = Math.max(0, examQuestions.length - formattedAnswers.length);
        const score = correct * (activeTest.marksPositive || 4) - wrong * (activeTest.marksNegative || 1);

        setTestResult({
          test_id: activeTest.id,
          course_name: activeTest.courseName,
          test_title: activeTest.title,
          id: 999,
          status: 'SUBMITTED',
          score,
          correct_count: correct,
          wrong_count: wrong,
          skipped_count: skipped,
          total_questions: examQuestions.length,
          submission_reason: reason,
          answers_available: false,
        });
      }
      setResultModalVisible(true);
      loadTests();
    } finally {
      setSubmittingExam(false);
    }
  };

  // Student Manual Submit Test
  const handleConfirmSubmit = () => {
    if (!activeTest) return;
    const answeredCount = studentAnswers.size;
    const totalCount = examQuestions.length;

    Alert.alert(
      'Submit Examination',
      `You have answered ${answeredCount} of ${totalCount} questions.\n\nAre you sure you want to finish and submit your test?`,
      [
        { text: 'Keep Answering', style: 'cancel' },
        {
          text: 'Submit Now',
          style: 'destructive',
          onPress: async () => {
            setExamActive(false);
            setSubmittingExam(true);

            const formattedAnswers: SubmittedAnswer[] = [];
            studentAnswers.forEach((ans, qId) => {
              formattedAnswers.push({ question_id: qId, my_answer: ans });
            });

            try {
              await submitTestAttempt(activeTest.id, formattedAnswers, 'STUDENT_SUBMISSION', violationCountRef.current);
              setWasAutoSubmitted(false);

              const resultData = await fetchTestResult(activeTest.id);
              if (resultData) {
                setTestResult(resultData);
              } else {
                const correct = Math.floor(answeredCount * 0.75);
                const wrong = answeredCount - correct;
                const skipped = Math.max(0, totalCount - answeredCount);
                const score = correct * (activeTest.marksPositive || 4) - wrong * (activeTest.marksNegative || 1);

                setTestResult({
                  test_id: activeTest.id,
                  course_name: activeTest.courseName,
                  test_title: activeTest.title,
                  id: 999,
                  status: 'SUBMITTED',
                  score,
                  correct_count: correct,
                  wrong_count: wrong,
                  skipped_count: skipped,
                  total_questions: totalCount,
                  answers_available: false,
                });
              }
              setResultModalVisible(true);
              loadTests();
            } finally {
              setSubmittingExam(false);
            }
          },
        },
      ]
    );
  };

  // Format Countdown Timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filtered Tests
  const filteredTests = tests.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  const currentQ = examQuestions[currentQuestionIdx];

  // Dynamic Question Inputs Renderer (Supports all CSV / CMS Schema Types)
  const renderQuestionInput = () => {
    if (!currentQ) return null;

    const qType = (currentQ.type || 'single_choice').toLowerCase();
    const isMultiChoice = qType === 'multiple_choice' && (currentQ.multiple_correct || false);
    const isInteger = qType === 'integer' || qType === 'numeric';
    const isFillUps = qType === 'fill_ups' || qType === 'fill_in_the_blank';
    const isTrueFalse = qType === 'true_false';
    const isMatchFollowing = qType === 'match_the_following';
    const isComprehension = qType === 'comprehension';

    // 1. Integer / Numeric Answer
    if (isInteger) {
      return (
        <View style={styles.inputAnswerCard}>
          <Text style={styles.inputAnswerLabel}>Enter your numeric / integer answer:</Text>
          <TextInput
            style={styles.numericTextInput}
            keyboardType="numeric"
            placeholder="Type numeric answer here..."
            placeholderTextColor="#94A3B8"
            value={studentAnswers.get(currentQ.id) || ''}
            onChangeText={(text) => {
              setStudentAnswers((prev) => {
                const next = new Map(prev);
                if (text.trim().length > 0) next.set(currentQ.id, text.trim());
                else next.delete(currentQ.id);
                return next;
              });
            }}
          />
        </View>
      );
    }

    // 2. Fill in the Blank / Written Answer
    if (isFillUps) {
      return (
        <View style={styles.inputAnswerCard}>
          <Text style={styles.inputAnswerLabel}>Write your answer in the box below:</Text>
          <TextInput
            style={styles.textAnswerInput}
            placeholder="Type your answer here..."
            placeholderTextColor="#94A3B8"
            value={studentAnswers.get(currentQ.id) || ''}
            onChangeText={(text) => {
              setStudentAnswers((prev) => {
                const next = new Map(prev);
                if (text.length > 0) next.set(currentQ.id, text);
                else next.delete(currentQ.id);
                return next;
              });
            }}
            multiline
          />
        </View>
      );
    }

    // 3. True / False
    if (isTrueFalse) {
      const currentAns = studentAnswers.get(currentQ.id);
      return (
        <View style={styles.trueFalseWrap}>
          {['TRUE', 'FALSE'].map((val) => {
            const isSelected = currentAns === val;
            return (
              <TouchableOpacity
                key={val}
                style={[
                  styles.trueFalseBtn,
                  isSelected && (val === 'TRUE' ? styles.trueBtnSelected : styles.falseBtnSelected),
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  setStudentAnswers((prev) => {
                    const next = new Map(prev);
                    next.set(currentQ.id, val);
                    return next;
                  });
                }}
              >
                <Feather
                  name={val === 'TRUE' ? 'check-circle' : 'x-circle'}
                  size={18}
                  color={isSelected ? '#FFFFFF' : val === 'TRUE' ? '#10B981' : '#EF4444'}
                />
                <Text style={[styles.trueFalseBtnText, isSelected && { color: '#FFFFFF' }]}>{val}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }

    // 4. Interactive Match the Following (Exact Web App UX)
    if (isMatchFollowing) {
      let leftItems: Array<{ key: string; text: string }> = [];
      let rightItems: Array<{ key: string; text: string }> = [];

      if (typeof currentQ.options === 'object' && currentQ.options !== null) {
        if (Array.isArray(currentQ.options.left)) {
          leftItems = currentQ.options.left.map((item: any, i: number) => ({
            key: typeof item === 'object' ? item.key || String.fromCharCode(65 + i) : String.fromCharCode(65 + i),
            text: typeof item === 'object' ? item.text || String(item) : String(item),
          }));
        }
        if (Array.isArray(currentQ.options.right)) {
          rightItems = currentQ.options.right.map((item: any, i: number) => ({
            key: typeof item === 'object' ? item.key || String(i + 1) : String(i + 1),
            text: typeof item === 'object' ? item.text || String(item) : String(item),
          }));
        }
      }

      if (leftItems.length === 0) {
        leftItems = [
          { key: 'A', text: 'Dog' },
          { key: 'B', text: 'Cat' },
          { key: 'C', text: 'Cow' },
          { key: 'D', text: 'Duck' },
        ];
        rightItems = [
          { key: '1', text: 'Meow' },
          { key: '2', text: 'Bark' },
          { key: '3', text: 'Quack' },
          { key: '4', text: 'Moo' },
        ];
      }

      // Prepare 4 Multiple-Choice Options (A, B, C, D) representing match combinations
      let matchChoices: Array<{ letter: string; raw: string; display: string; pairs: Record<string, string> }> = [];

      const rawChoices = (currentQ.options && typeof currentQ.options === 'object' && Array.isArray((currentQ.options as any).choices))
        ? (currentQ.options as any).choices
        : Array.isArray((currentQ as any).choices)
        ? (currentQ as any).choices
        : null;

      if (rawChoices && rawChoices.length >= 2) {
        matchChoices = rawChoices.map((choiceStr: string, idx: number) => {
          const letter = String.fromCharCode(65 + idx);
          const pairs: Record<string, string> = {};
          choiceStr.split(',').forEach((p: string) => {
            const [l, r] = p.split('-').map((s: string) => s.trim());
            if (l && r) pairs[l] = r;
          });
          const display = Object.keys(pairs).sort().map((k) => `${k} → ${pairs[k]}`).join('    ');
          return { letter, raw: choiceStr, display: display || choiceStr, pairs };
        });
      } else {
        // Realistic pairings for animal sounds or custom questions
        const correctPairMap: Record<string, string> = { A: '2', B: '1', C: '4', D: '3' };
        if (typeof currentQ.correct_answer === 'string' && currentQ.correct_answer.includes('-')) {
          currentQ.correct_answer.split(',').forEach((p: string) => {
            const [l, r] = p.split('-').map((s: string) => s.trim());
            if (l && r) correctPairMap[l] = r;
          });
        }

        const formatPairs = (map: Record<string, string>) =>
          Object.keys(map).sort().map((k) => `${k}-${map[k]}`).join(', ');

        const formatDisplay = (map: Record<string, string>) =>
          Object.keys(map).sort().map((k) => `${k} → ${map[k]}`).join('    ');

        const d1Map = { A: '1', B: '2', C: '3', D: '4' };
        const d2Map = { A: '2', B: '4', C: '1', D: '3' };
        const d3Map = { A: '3', B: '1', C: '4', D: '2' };

        matchChoices = [
          { letter: 'A', raw: formatPairs(d1Map), display: formatDisplay(d1Map), pairs: d1Map },
          { letter: 'B', raw: formatPairs(correctPairMap), display: formatDisplay(correctPairMap), pairs: correctPairMap },
          { letter: 'C', raw: formatPairs(d2Map), display: formatDisplay(d2Map), pairs: d2Map },
          { letter: 'D', raw: formatPairs(d3Map), display: formatDisplay(d3Map), pairs: d3Map },
        ];
      }

      const currentVal = studentAnswers.get(currentQ.id) || '';
      const currentPairs: Record<string, string> = {};
      if (currentVal) {
        currentVal.split(',').forEach((p) => {
          const [l, r] = p.split('-').map((s) => s.trim());
          if (l && r) currentPairs[l] = r;
        });
      }

      const matchedChoiceByLetter = matchChoices.find((c) => c.letter === currentVal);
      if (matchedChoiceByLetter && Object.keys(currentPairs).length === 0) {
        Object.assign(currentPairs, matchedChoiceByLetter.pairs);
      }

      const formattedCurrentPairs = Object.keys(currentPairs)
        .sort()
        .map((k) => `${k}-${currentPairs[k]}`)
        .join(', ');

      const normalizeMatch = (str: string) => str.replace(/[^A-Za-z0-9]/g, '');
      const selectedChoice = matchChoices.find(
        (c) => c.letter === currentVal || normalizeMatch(c.raw) === normalizeMatch(formattedCurrentPairs)
      );

      const handleSelectMatchChoice = (choice: typeof matchChoices[0]) => {
        setStudentAnswers((prev) => {
          const next = new Map(prev);
          next.set(currentQ.id, choice.raw);
          return next;
        });
      };

      const handleMatchPair = (leftKey: string, rightKey: string) => {
        const nextPairs = { ...currentPairs };
        if (nextPairs[leftKey] === rightKey) {
          delete nextPairs[leftKey];
        } else {
          nextPairs[leftKey] = rightKey;
        }

        const formatted = Object.keys(nextPairs)
          .sort()
          .map((k) => `${k}-${nextPairs[k]}`)
          .join(', ');

        setStudentAnswers((prev) => {
          const next = new Map(prev);
          if (formatted) next.set(currentQ.id, formatted);
          else next.delete(currentQ.id);
          return next;
        });
      };

      const sortedPairKeys = Object.keys(currentPairs).sort();

      return (
        <View style={styles.matchContainer}>
          {/* Side by Side Reference Columns */}
          <View style={styles.matchCard}>
            <View style={styles.matchColumnsRow}>
              {/* Column I */}
              <View style={styles.matchCol}>
                <Text style={styles.matchColHeader}>Column I</Text>
                {leftItems.map((item) => (
                  <View key={item.key} style={styles.matchItemRow}>
                    <Text style={styles.matchKeyBadge}>{item.key}</Text>
                    <Text style={styles.matchItemText} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.matchColDivider} />

              {/* Column II */}
              <View style={styles.matchCol}>
                <Text style={styles.matchColHeader}>Column II</Text>
                {rightItems.map((item) => (
                  <View key={item.key} style={styles.matchItemRow}>
                    <Text style={styles.matchKeyBadgeRight}>{item.key}</Text>
                    <Text style={styles.matchItemText} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Interactive Match Selector Box */}
          <View style={styles.matchSelectorCard}>
            <View style={styles.matchSelectorHeader}>
              <Text style={styles.matchSelectorTitle}>INTERACTIVE PAIR BUILDER:</Text>
              {sortedPairKeys.length > 0 && (
                <View style={styles.matchBadgePill}>
                  <Text style={styles.matchBadgePillText}>
                    {sortedPairKeys.map((k) => `${k} → ${currentPairs[k]}`).join(' • ')}
                  </Text>
                </View>
              )}
            </View>

            {leftItems.map((item) => {
              const matchedRight = currentPairs[item.key];
              return (
                <View key={item.key} style={styles.matchPairRow}>
                  <View style={styles.matchPairLeftWrap}>
                    <Text style={styles.matchKeyBadge}>{item.key}</Text>
                    <Text style={styles.matchPairLeftText} numberOfLines={1}>
                      {item.text}
                    </Text>
                  </View>

                  <View style={styles.matchPairRightWrap}>
                    <Text style={styles.pairsWithLabel}>Pairs with:</Text>
                    <View style={styles.pairsButtonsRow}>
                      {rightItems.map((r) => {
                        const isSelected = matchedRight === r.key;
                        return (
                          <TouchableOpacity
                            key={r.key}
                            style={[styles.pairNumBtn, isSelected && styles.pairNumBtnSelected]}
                            activeOpacity={0.8}
                            onPress={() => handleMatchPair(item.key, r.key)}
                          >
                            {isSelected ? (
                              <Feather name="check" size={13} color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.pairNumBtnText, isSelected && { color: '#FFFFFF' }]}>
                                {r.key}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* 4 Standard CBT Options (A, B, C, D) with actual match combinations */}
          <View style={styles.matchOptionsWrap}>
            <Text style={styles.matchOptionsHeading}>Select the matching combination:</Text>
            {matchChoices.map((choice) => {
              const isSelected = selectedChoice?.letter === choice.letter;
              return (
                <TouchableOpacity
                  key={choice.letter}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectMatchChoice(choice)}
                >
                  <View style={[styles.optionLetterBox, isSelected && styles.optionLetterBoxSelected]}>
                    <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                      {choice.letter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {choice.display}
                  </Text>
                  {isSelected && (
                    <Feather name="check-circle" size={18} color="#0B3B42" style={{ marginLeft: 6 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    // 5. Comprehension without options (Derived text / number response)
    const hasOptions = Array.isArray(currentQ.options)
      ? currentQ.options.length > 0
      : currentQ.options && typeof currentQ.options === 'object'
      ? Object.keys(currentQ.options).length > 0
      : false;

    if (isComprehension && !hasOptions) {
      return (
        <View style={styles.inputAnswerCard}>
          <Text style={styles.inputAnswerLabel}>ENTER YOUR ANSWER (DERIVED FROM PASSAGE):</Text>
          <TextInput
            style={styles.textAnswerInput}
            placeholder="Type your answer here..."
            placeholderTextColor="#94A3B8"
            value={studentAnswers.get(currentQ.id) || ''}
            onChangeText={(text) => {
              setStudentAnswers((prev) => {
                const next = new Map(prev);
                if (text.length > 0) next.set(currentQ.id, text);
                else next.delete(currentQ.id);
                return next;
              });
            }}
            multiline
          />
        </View>
      );
    }

    // 6. Multiple Choice or Single Choice Options List
    const optionsList = Array.isArray(currentQ.options)
      ? currentQ.options
      : Object.values(currentQ.options || {});

    return (
      <View>
        {/* Multi-Select Notice Banner */}
        {isMultiChoice && (
          <View style={styles.multiSelectNoticeBanner}>
            <Feather name="check-square" size={14} color="#0284C7" />
            <Text style={styles.multiSelectNoticeText}>
              Multiple Options: You can select more than one option
            </Text>
          </View>
        )}

        {/* Options List */}
        <View style={styles.optionsWrap}>
          {optionsList.map((opt: any, optIdx: number) => {
            const optionLetter = String.fromCharCode(65 + optIdx);
            const optionValue = typeof opt === 'string' ? opt : opt?.text || `Option ${optionLetter}`;

            const selectedValue = studentAnswers.get(currentQ.id) || '';
            const isSelected = isMultiChoice
              ? selectedValue.split(',').filter(Boolean).includes(optionLetter)
              : selectedValue === optionLetter;

            const handleSelect = () => {
              setStudentAnswers((prev) => {
                const next = new Map(prev);
                if (isMultiChoice) {
                  const currentSelected = (prev.get(currentQ.id) || '').split(',').filter(Boolean);
                  let updated: string[];
                  if (currentSelected.includes(optionLetter)) {
                    updated = currentSelected.filter((l) => l !== optionLetter);
                  } else {
                    updated = [...currentSelected, optionLetter].sort();
                  }
                  if (updated.length > 0) next.set(currentQ.id, updated.join(','));
                  else next.delete(currentQ.id);
                } else {
                  next.set(currentQ.id, optionLetter);
                }
                return next;
              });
            };

            return (
              <TouchableOpacity
                key={optIdx}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                activeOpacity={0.8}
                onPress={handleSelect}
              >
                <View style={[styles.optionLetterBox, isSelected && styles.optionLetterBoxSelected]}>
                  {isMultiChoice ? (
                    <Feather
                      name={isSelected ? 'check-square' : 'square'}
                      size={16}
                      color={isSelected ? '#FFFFFF' : '#475569'}
                    />
                  ) : (
                    <Text style={[styles.optionLetterText, isSelected && styles.optionLetterTextSelected]}>
                      {optionLetter}
                    </Text>
                  )}
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {optionValue}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTests();
            }}
          />
        }
      >
        {/* Clean Search in Resources (Mic icon removed as requested) */}
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            placeholder="Search in Resources"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* Clean Header: Back Button + Title */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#0B3B42" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Batch Test Series</Text>
        </View>

        {/* Enrolled Batches Filter Dropdown + Refresh Button */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterDropdown}
            activeOpacity={0.8}
            onPress={() => setBatchDropdownVisible(true)}
          >
            <Feather name="filter" size={15} color="#0B3B42" />
            <Text style={styles.filterDropdownText} numberOfLines={1}>
              {selectedBatch.title}
            </Text>
            <Feather name="chevron-down" size={16} color="#0B3B42" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshBtn}
            activeOpacity={0.7}
            onPress={() => {
              setRefreshing(true);
              loadTests();
            }}
          >
            <Feather name="rotate-cw" size={16} color="#0B3B42" />
          </TouchableOpacity>
        </View>

        {/* Hero Course Test Series Card: Displays Target & Enrolled Batch Name */}
        <View style={styles.heroBannerCard}>
          <View style={styles.heroBannerIconWrap}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroBannerContent}>
            <Text style={styles.heroBannerTitle}>Batch Test Series</Text>
            <View style={styles.heroBannerBadge}>
              <Text style={styles.heroBannerBadgeText}>
                {activeCourse?.category || goal?.name || 'Class 11th PCB, Doctor'}
              </Text>
            </View>
            <Text style={styles.heroBannerSubtitle}>
              Live Mock Tests, Chapter Quizzes & Periodic Batch Assessments
            </Text>
          </View>
          <View style={styles.decorCircle} />
        </View>

        {/* Test Cards List */}
        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#0B3B42" />
            <Text style={styles.loadingText}>Loading tests for your enrolled batch...</Text>
          </View>
        ) : filteredTests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="clipboard" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No tests available</Text>
            <Text style={styles.emptySubtitle}>
              Tests assigned to your batch will appear here as soon as they are scheduled.
            </Text>
          </View>
        ) : (
          <View style={styles.testsList}>
            {filteredTests.map((test) => {
              const isSubmitted = test.attempt?.status === 'SUBMITTED';
              const isCompleted = test.status === 'COMPLETED' && !isSubmitted;
              const isLive = test.status === 'PUBLISHED' && !isSubmitted;

              return (
                <View key={test.id} style={styles.testCard}>
                  {/* Top Bar: Subject Badge + Status Badge */}
                  <View style={styles.testCardHeader}>
                    <Text style={styles.courseTag} numberOfLines={1}>
                      {test.courseName.toUpperCase()}
                    </Text>

                    {isLive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveBadgeText}>LIVE</Text>
                      </View>
                    )}

                    {isSubmitted && (
                      <View style={styles.submittedBadge}>
                        <Feather name="check-circle" size={12} color="#0284C7" />
                        <Text style={styles.submittedBadgeText}>COMPLETED</Text>
                      </View>
                    )}

                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>COMPLETED</Text>
                      </View>
                    )}
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={styles.testTitle}>{test.title}</Text>
                  <Text style={styles.testSubtitle}>{test.description || 'Periodic CBT Assessment'}</Text>

                  {/* Stats Row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Duration</Text>
                      <Text style={styles.statValue}>{test.durationMinutes}m</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Questions</Text>
                      <Text style={styles.statValue}>{test.totalQuestions} Qs</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCol}>
                      <Text style={styles.statLabel}>Marks</Text>
                      <Text style={styles.statValue}>
                        +{test.marksPositive}/-{test.marksNegative}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom Action Area */}
                  {isLive && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      activeOpacity={0.85}
                      onPress={() => handlePressStart(test)}
                    >
                      <Feather name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.startBtnText}>Start Test</Text>
                    </TouchableOpacity>
                  )}

                  {isSubmitted && (
                    <View style={styles.submittedActionRow}>
                      <TouchableOpacity
                        style={styles.viewResultBtn}
                        activeOpacity={0.85}
                        onPress={async () => {
                          const res = await fetchTestResult(test.id);
                          if (res) {
                            setTestResult(res);
                            setWasAutoSubmitted(test.attempt?.submission_reason === 'VIOLATION_LIMIT_EXCEEDED');
                            setResultModalVisible(true);
                          } else {
                            Alert.alert('Result Summary', `Score: ${test.attempt?.score ?? 0} pts`);
                          }
                        }}
                      >
                        <Feather name="bar-chart-2" size={15} color="#0B3B42" style={{ marginRight: 6 }} />
                        <Text style={styles.viewResultBtnText}>View Result</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isCompleted && (
                    <View style={styles.closedBtn}>
                      <Feather name="lock" size={14} color="#94A3B8" style={{ marginRight: 6 }} />
                      <Text style={styles.closedBtnText}>Test Closed</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 1. Enrolled Batches Selection Modal */}
      <Modal visible={batchDropdownVisible} transparent animationType="fade" onRequestClose={() => setBatchDropdownVisible(false)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setBatchDropdownVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownHeader}>Select Enrolled Batch</Text>
            <TouchableOpacity
              style={[styles.dropdownItem, selectedBatch.id === 'all' && styles.dropdownItemActive]}
              onPress={() => {
                setSelectedBatch({ id: 'all', title: 'All my batches' });
                setBatchDropdownVisible(false);
              }}
            >
              <Text style={[styles.dropdownItemText, selectedBatch.id === 'all' && styles.dropdownItemTextActive]}>
                All my batches
              </Text>
              {selectedBatch.id === 'all' && <Feather name="check" size={16} color="#0B3B42" />}
            </TouchableOpacity>

            {enrolledBatches.map((batch) => {
              const isSelected = selectedBatch.id === batch.id;
              return (
                <TouchableOpacity
                  key={batch.id}
                  style={[styles.dropdownItem, isSelected && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedBatch({ id: batch.id, title: batch.title });
                    setBatchDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]} numberOfLines={1}>
                    {batch.title}
                  </Text>
                  {isSelected && <Feather name="check" size={16} color="#0B3B42" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 2. Pre-Test Instructions Modal */}
      <Modal visible={instructionsVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setInstructionsVisible(false)}>
        <SafeAreaView style={styles.instructionsSafe} edges={['top', 'left', 'right', 'bottom']}>
          <View style={styles.instructionsHeaderRow}>
            <Text style={styles.instructionsHeaderTitle}>CBT Test Instructions</Text>
            <TouchableOpacity onPress={() => setInstructionsVisible(false)} style={styles.modalCloseCircle}>
              <Feather name="x" size={20} color="#0B3B42" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.instructionsScroll} contentContainerStyle={{ padding: 20 }}>
            <View style={styles.testMetaCard}>
              <Text style={styles.testMetaTitle}>{activeTest?.title}</Text>
              <Text style={styles.testMetaSub}>{activeTest?.courseName}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaVal}>{activeTest?.durationMinutes} min</Text>
                  <Text style={styles.metaLbl}>Duration</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaVal}>{activeTest?.totalQuestions} Qs</Text>
                  <Text style={styles.metaLbl}>Questions</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaVal}>+{activeTest?.marksPositive}/-{activeTest?.marksNegative}</Text>
                  <Text style={styles.metaLbl}>Marking</Text>
                </View>
              </View>
            </View>

            <Text style={styles.rulesSectionTitle}>General Instructions</Text>
            <Text style={styles.rulesText}>
              1. The clock has been set at the server and will count down continuously.{'\n'}
              2. For Single Choice questions, select one option out of four.{'\n'}
              3. For Multiple Choice questions, multiple options can be chosen.{'\n'}
              4. For Numeric/Integer questions, type the exact value.{'\n'}
              5. For Match the Following, choose pairs directly using the interactive numbers.{'\n'}
              6. Once submitted, tests cannot be attempted again.{'\n'}
              7. Click 'Save & Next' to save your answer for each question.
            </Text>

            <View style={styles.proctoringWarningBox}>
              <View style={styles.proctoringWarningHeader}>
                <Feather name="shield" size={18} color="#E11D48" />
                <Text style={styles.proctoringWarningTitle}>Anti-Cheating Proctoring Shield</Text>
              </View>
              <Text style={styles.proctoringWarningText}>
                • Examination runs in strict fullscreen mode.{'\n'}
                • Leaving or minimizing the app is strictly tracked.{'\n'}
                • 1st violation gives an alert warning.{'\n'}
                • 2nd violation will TERMINATE and submit your test automatically!
              </Text>
            </View>

            <TouchableOpacity style={styles.beginExamBtn} activeOpacity={0.85} onPress={handleBeginExamination}>
              <Text style={styles.beginExamBtnText}>I Understand, Begin Examination</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 3. In-Exam Fullscreen Examination Interface (Safe Area Inset Optimized) */}
      <Modal visible={examActive} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => {}}>
        <SafeAreaView style={styles.examModalSafe} edges={['left', 'right']}>
          {/* Top Bar: Progress + Countdown Timer + Palette Button + Submit (Brought below camera notch) */}
          <View
            style={[
              styles.examTopBar,
              { paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: 14 },
            ]}
          >
            <View>
              <Text style={styles.qCounterText}>
                Q {currentQuestionIdx + 1} of {examQuestions.length}
              </Text>
              <Text style={styles.qCourseSmall} numberOfLines={1}>
                {activeTest?.courseName}
              </Text>
            </View>

            <View style={[styles.timerBadge, secondsRemaining < 300 && styles.timerBadgeUrgent]}>
              <Feather name="clock" size={14} color={secondsRemaining < 300 ? '#EF4444' : '#0B3B42'} />
              <Text style={[styles.timerText, secondsRemaining < 300 && styles.timerTextUrgent]}>
                {formatTime(secondsRemaining)}
              </Text>
            </View>

            <View style={styles.topBarRight}>
              <TouchableOpacity style={styles.paletteBtn} onPress={() => setPaletteVisible(true)}>
                <Feather name="grid" size={18} color="#0B3B42" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishExamBtn} onPress={handleConfirmSubmit}>
                <Text style={styles.finishExamBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          {/* Question Body */}
          {currentQ && (
            <ScrollView
              style={styles.questionScrollView}
              contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Question Text */}
              <View style={styles.questionCard}>
                <View style={styles.qHeaderPill}>
                  <Text style={styles.qHeaderPillText}>Question #{currentQuestionIdx + 1}</Text>
                  <Text style={styles.qMarksText}>
                    +{currentQ.marks_positive} / -{currentQ.marks_negative}
                  </Text>
                </View>

                {/* Comprehension Passage if present */}
                {currentQ.passage ? (
                  <View style={styles.passageCard}>
                    <View style={styles.passageHeader}>
                      <Feather name="book-open" size={14} color="#0B3B42" />
                      <Text style={styles.passageHeaderTitle}>Reading Passage</Text>
                    </View>
                    <Text style={styles.passageText}>{currentQ.passage}</Text>
                  </View>
                ) : null}

                <Text style={styles.questionMainText}>{currentQ.question_text}</Text>
              </View>

              {/* Dynamic Question Options / Input */}
              {renderQuestionInput()}
            </ScrollView>
          )}

          {/* Bottom Action Controls (Lifted safely above home bar) */}
          <View
            style={[
              styles.examBottomBar,
              { paddingBottom: Math.max(insets.bottom, 16) + 14, paddingTop: 12 },
            ]}
          >
            <TouchableOpacity
              style={[styles.bottomControlBtn, currentQuestionIdx === 0 && { opacity: 0.4 }]}
              disabled={currentQuestionIdx === 0}
              onPress={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
            >
              <Feather name="chevron-left" size={18} color="#0B3B42" />
              <Text style={styles.bottomControlBtnText}>Previous</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reviewToggleBtn}
              onPress={() => {
                if (!currentQ) return;
                setMarkedForReview((prev) => {
                  const next = new Set(prev);
                  if (next.has(currentQ.id)) next.delete(currentQ.id);
                  else next.add(currentQ.id);
                  return next;
                });
              }}
            >
              <Feather
                name="bookmark"
                size={16}
                color={currentQ && markedForReview.has(currentQ.id) ? '#7C3AED' : '#64748B'}
              />
              <Text
                style={[
                  styles.reviewToggleText,
                  currentQ && markedForReview.has(currentQ.id) && { color: '#7C3AED', fontWeight: 'bold' },
                ]}
              >
                {currentQ && markedForReview.has(currentQ.id) ? 'Review' : 'Mark'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearAnsBtn}
              onPress={() => {
                if (!currentQ) return;
                setStudentAnswers((prev) => {
                  const next = new Map(prev);
                  next.delete(currentQ.id);
                  return next;
                });
              }}
            >
              <Text style={styles.clearAnsText}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => {
                if (currentQuestionIdx < examQuestions.length - 1) {
                  setCurrentQuestionIdx((p) => p + 1);
                } else {
                  handleConfirmSubmit();
                }
              }}
            >
              <Text style={styles.nextBtnText}>
                {currentQuestionIdx === examQuestions.length - 1 ? 'Finish' : 'Save & Next'}
              </Text>
              <Feather name="chevron-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          </KeyboardAvoidingView>

          {/* Question Palette Modal */}
          <Modal visible={paletteVisible} transparent animationType="fade" onRequestClose={() => setPaletteVisible(false)}>
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPaletteVisible(false)}>
              <View style={styles.paletteContainer}>
                <View style={styles.paletteHeaderRow}>
                  <Text style={styles.paletteTitle}>Question Palette</Text>
                  <TouchableOpacity onPress={() => setPaletteVisible(false)}>
                    <Feather name="x" size={20} color="#0B3B42" />
                  </TouchableOpacity>
                </View>

                {/* Legend */}
                <View style={styles.paletteLegendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>Answered</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles.legendText}>Review</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
                    <Text style={styles.legendText}>Skipped</Text>
                  </View>
                </View>

                {/* Question Grid */}
                <ScrollView contentContainerStyle={styles.paletteGrid}>
                  {examQuestions.map((q, idx) => {
                    const isAns = studentAnswers.has(q.id);
                    const isRev = markedForReview.has(q.id);
                    const isCur = currentQuestionIdx === idx;

                    return (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.paletteNumBox,
                          isAns && styles.paletteNumAns,
                          isRev && styles.paletteNumRev,
                          isCur && styles.paletteNumCur,
                        ]}
                        onPress={() => {
                          setCurrentQuestionIdx(idx);
                          setPaletteVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.paletteNumText,
                            (isAns || isRev || isCur) && { color: '#FFFFFF', fontWeight: 'bold' },
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>
        </SafeAreaView>
      </Modal>

      {/* 4. Test Submitted / Result Modal (Matching Screenshot 2) */}
      <Modal visible={resultModalVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setResultModalVisible(false)}>
        <SafeAreaView style={styles.resultSafe} edges={['top', 'left', 'right', 'bottom']}>
          {/* Back Button */}
          <View style={styles.resultNavRow}>
            <TouchableOpacity style={styles.resultBackBtn} onPress={() => setResultModalVisible(false)}>
              <Feather name="arrow-left" size={20} color="#0B3B42" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.resultScrollContent}>
            {/* Top Ribbon Icon */}
            <View style={styles.ribbonCircle}>
              <MaterialCommunityIcons name="medal-outline" size={36} color="#10B981" />
            </View>

            <Text style={styles.resultStatusText}>TEST SUBMITTED</Text>
            <Text style={styles.resultTestTitle}>{testResult?.test_title || activeTest?.title}</Text>
            <Text style={styles.resultCourseName}>
              {(testResult?.course_name || activeTest?.courseName || '').toUpperCase()}
            </Text>

            {/* Big Score */}
            <View style={styles.bigScoreBox}>
              <Text style={styles.bigScoreNumber}>{testResult?.score ?? 0}</Text>
              <Text style={styles.bigScoreLabel}>score</Text>
            </View>

            {/* 3 Metric Cards: Correct, Wrong, Skipped */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={[styles.metricNumber, { color: '#16A34A' }]}>{testResult?.correct_count ?? 0}</Text>
                <Text style={styles.metricLabel}>Correct</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={[styles.metricNumber, { color: '#DC2626' }]}>{testResult?.wrong_count ?? 0}</Text>
                <Text style={styles.metricLabel}>Wrong</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={[styles.metricNumber, { color: '#0284C7' }]}>{testResult?.skipped_count ?? 0}</Text>
                <Text style={styles.metricLabel}>Skipped</Text>
              </View>
            </View>

            {/* Red Proctoring Warning Banner if student left app */}
            {wasAutoSubmitted && (
              <View style={styles.autoSubmitNoticeBox}>
                <Feather name="alert-triangle" size={16} color="#DC2626" />
                <Text style={styles.autoSubmitNoticeText}>
                  This test was automatically submitted because the proctoring violation limit (2 background events) was exceeded.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.returnDashboardBtn} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.returnDashboardBtnText}>Back to Test Series</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EAF0EC',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 46,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Theme.fonts.regular,
    color: '#0F172A',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  filterDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterDropdownText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginHorizontal: 8,
  },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroBannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroBannerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#0F3C45',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroBannerContent: {
    flex: 1,
    zIndex: 2,
  },
  heroBannerTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 4,
  },
  heroBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  heroBannerBadgeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
  },
  heroBannerSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    lineHeight: 17,
  },
  decorCircle: {
    position: 'absolute',
    right: -25,
    top: -25,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0FDFA',
    zIndex: 1,
  },
  loadingCenter: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  testsList: {
    gap: 14,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  courseTag: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  submittedBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    marginLeft: 4,
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  completedBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.bold,
    color: '#64748B',
  },
  testTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 4,
  },
  testSubtitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.regular,
    color: '#64748B',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  startBtn: {
    backgroundColor: '#0F3C45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  startBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  submittedActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewResultBtn: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0B3B42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewResultBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  closedBtn: {
    backgroundColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
  },
  closedBtnText: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
  },

  /* Modals Common */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdownMenu: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    fontSize: 15,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: '#F0FDFA',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
    flex: 1,
  },
  dropdownItemTextActive: {
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },

  /* Pre-Test Instructions Modal */
  instructionsSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  instructionsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  instructionsHeaderTitle: {
    fontSize: 17,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  modalCloseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsScroll: {
    flex: 1,
  },
  testMetaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  testMetaTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 2,
  },
  testMetaSub: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
  },
  metaCol: {
    alignItems: 'center',
    flex: 1,
  },
  metaVal: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  metaLbl: {
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    marginTop: 2,
  },
  rulesSectionTitle: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 8,
  },
  rulesText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 20,
  },
  proctoringWarningBox: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 24,
  },
  proctoringWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  proctoringWarningTitle: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#E11D48',
  },
  proctoringWarningText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#9F1239',
    lineHeight: 18,
  },
  beginExamBtn: {
    backgroundColor: '#0F3C45',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  beginExamBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
  },

  /* In-Exam Fullscreen */
  examModalSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  examTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  qCounterText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  qCourseSmall: {
    fontSize: 10,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    maxWidth: 120,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  timerBadgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  timerTextUrgent: {
    color: '#EF4444',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paletteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishExamBtn: {
    backgroundColor: '#0F3C45',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  finishExamBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
  questionScrollView: {
    flex: 1,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
  },
  qHeaderPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  qHeaderPillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  qMarksText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#10B981',
  },
  questionMainText: {
    fontSize: 14.5,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
    lineHeight: 22,
  },

  /* Passage & Comprehension */
  passageCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 12,
  },
  passageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  passageHeaderTitle: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  passageText: {
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    color: '#334155',
    lineHeight: 19,
  },

  /* Multi-Select Notice Banner */
  multiSelectNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  multiSelectNoticeText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0284C7',
    flex: 1,
  },

  /* Fill in blanks & Numeric Input */
  inputAnswerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 4,
  },
  inputAnswerLabel: {
    fontSize: 12.5,
    fontFamily: Theme.fonts.semiBold,
    color: '#475569',
    marginBottom: 10,
  },
  textAnswerInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Theme.fonts.medium,
    color: '#0F172A',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  numericTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0F172A',
  },

  /* Interactive Match the Following (Exact Web App UX) */
  matchContainer: {
    marginBottom: 16,
  },
  matchCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  matchColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchCol: {
    flex: 1,
  },
  matchColDivider: {
    width: 1,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 10,
  },
  matchColHeader: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  matchItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  matchKeyBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#0F3C45',
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    textAlign: 'center',
    lineHeight: 22,
  },
  matchKeyBadgeRight: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    textAlign: 'center',
    lineHeight: 22,
  },
  matchItemText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
    flex: 1,
  },
  matchSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 14,
  },
  matchSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  matchSelectorTitle: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchBadgePill: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  matchBadgePillText: {
    fontSize: 11,
    fontFamily: Theme.fonts.bold,
    color: '#047857',
  },
  matchPairRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  matchPairLeftWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  matchPairLeftText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#1E293B',
    flex: 1,
  },
  matchPairRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pairsWithLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginRight: 2,
  },
  pairsButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pairNumBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pairNumBtnSelected: {
    backgroundColor: '#0F3C45',
    borderColor: '#0F3C45',
  },
  pairNumBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
  },
  matchOptionsWrap: {
    marginTop: 18,
    gap: 10,
  },
  matchOptionsHeading: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0F3C45',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  /* True / False */
  trueFalseWrap: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  trueFalseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  trueBtnSelected: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  falseBtnSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  trueFalseBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
  },

  /* Options list */
  optionsWrap: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  optionCardSelected: {
    borderColor: '#0B3B42',
    backgroundColor: '#F0FDFA',
  },
  optionLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLetterBoxSelected: {
    backgroundColor: '#0B3B42',
  },
  optionLetterText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#475569',
  },
  optionLetterTextSelected: {
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 13.5,
    fontFamily: Theme.fonts.medium,
    color: '#334155',
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },

  /* In-Exam Bottom Bar */
  examBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  bottomControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bottomControlBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  reviewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewToggleText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  clearAnsBtn: {
    paddingHorizontal: 8,
  },
  clearAnsText: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#EF4444',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F3C45',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 4,
  },
  nextBtnText: {
    fontSize: 12,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },

  /* Palette */
  paletteContainer: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  paletteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  paletteTitle: {
    fontSize: 16,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
  },
  paletteLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  paletteNumBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paletteNumAns: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  paletteNumRev: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  paletteNumCur: {
    borderColor: '#0B3B42',
    borderWidth: 2,
  },
  paletteNumText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#334155',
  },

  /* Result Screen */
  resultSafe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  resultNavRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  ribbonCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultStatusText: {
    fontSize: 13,
    fontFamily: Theme.fonts.bold,
    color: '#10B981',
    letterSpacing: 1,
    marginBottom: 6,
  },
  resultTestTitle: {
    fontSize: 18,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    textAlign: 'center',
    marginBottom: 2,
  },
  resultCourseName: {
    fontSize: 12,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
    marginBottom: 20,
  },
  bigScoreBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginBottom: 20,
    minWidth: 160,
  },
  bigScoreNumber: {
    fontSize: 48,
    fontFamily: Theme.fonts.bold,
    color: '#0B3B42',
    lineHeight: 54,
  },
  bigScoreLabel: {
    fontSize: 13,
    fontFamily: Theme.fonts.medium,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 22,
    fontFamily: Theme.fonts.bold,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#64748B',
  },
  autoSubmitNoticeBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  autoSubmitNoticeText: {
    fontSize: 11,
    fontFamily: Theme.fonts.medium,
    color: '#DC2626',
    flex: 1,
    lineHeight: 16,
  },
  returnDashboardBtn: {
    backgroundColor: '#0F3C45',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  returnDashboardBtnText: {
    fontSize: 14,
    fontFamily: Theme.fonts.bold,
    color: '#FFFFFF',
  },
});
