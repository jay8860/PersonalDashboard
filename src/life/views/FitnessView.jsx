import { useState } from 'react';
import { format } from 'date-fns';
import { Activity, BedDouble, ChevronDown, ChevronUp, Droplets, HeartPulse, Info, Scale, TimerReset, Trash2, TrendingUp, Waves, Footprints } from 'lucide-react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const createEntryDraft = () => ({
  date: new Date().toISOString().slice(0, 10),
  weightKg: '',
  bodyFatPct: '',
  waistCm: '',
  chestCm: '',
  hipCm: '',
  restingHeartRate: '',
  steps: '',
  sleepHours: '',
  workoutMinutes: '',
  waterLiters: '',
  note: '',
});

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMetric = (value, unit) => {
  if (value == null || value === '') return 'Not set';
  return Number(value).toFixed(1) + unit;
};

const computeBmi = (weightKg, heightCm) => {
  const weight = numeric(weightKg);
  const height = numeric(heightCm);
  if (weight == null || height == null || height === 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
};

const workoutSplitOptions = [
  { id: 'combined', label: 'Combined Body Parts' },
  { id: 'single', label: 'Single Body Part Focus' },
];

const buildWeightCue = ({ heavy = false, medium = false, unilateral = false }) => {
  if (heavy) return unilateral ? '1 x 10 kg dumbbell' : '2 x 10 kg dumbbells';
  if (medium) return unilateral ? '1 x 5 kg dumbbell' : '2 x 5 kg dumbbells';
  return 'Bodyweight / mat / push-up bars';
};

const buildHomeGymSchedule = ({ splitType, latestWeightKg }) => {
  const strongerBase = (numeric(latestWeightKg) || 86) >= 80;
  const combinedSchedule = [
    {
      day: 'Monday',
      focus: 'Recovery / Off',
      duration: 'Off day',
      note: 'Walk, stretch lightly, and recover.',
      exercises: [],
    },
    {
      day: 'Tuesday',
      focus: 'Push + Core',
      duration: '30 min',
      note: 'Chest, shoulders, triceps, and ab stability.',
      exercises: [
        ['Flat dumbbell bench press', buildWeightCue({ heavy: strongerBase, medium: !strongerBase }), '4 x 10-12'],
        ['Push-ups on bars', 'Bodyweight', '3 x 10-15'],
        ['Seated dumbbell shoulder press', buildWeightCue({ medium: true }), '3 x 10-12'],
        ['Bench tricep dips', 'Bodyweight', '3 x 12-15'],
        ['Dead bug or plank', 'Bodyweight / mat', '3 x 40 sec'],
      ],
      optionalExercises: [
        ['Incline dumbbell squeeze press', '2 x 5 kg dumbbells', '3 x 12'],
        ['Arnold press', '2 x 5 kg dumbbells', '3 x 10'],
        ['Hollow body hold', 'Bodyweight / mat', '3 x 25 sec'],
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Lower Body + Pull',
      duration: '30 min',
      note: 'Legs, glutes, and upper-back work.',
      exercises: [
        ['Goblet squat', strongerBase ? '1 x 10 kg dumbbell' : '1 x 5 kg dumbbell', '4 x 12'],
        ['Romanian deadlift', buildWeightCue({ heavy: strongerBase, medium: !strongerBase }), '4 x 10-12'],
        ['One-arm dumbbell row', buildWeightCue({ heavy: true, unilateral: true }), '3 x 12 each side'],
        ['Reverse lunges', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 10 each side'],
        ['Glute bridge', 'Bodyweight / mat', '3 x 15'],
      ],
      optionalExercises: [
        ['Bench-supported hip thrust', '1 x 10 kg dumbbell optional', '3 x 12'],
        ['Split squat iso hold', 'Bodyweight / 2 x 5 kg optional', '3 x 30 sec'],
        ['Bird dog', 'Bodyweight / mat', '3 x 12 each side'],
      ],
    },
    {
      day: 'Thursday',
      focus: 'Upper Body Mix',
      duration: '30 min',
      note: 'Balanced upper-body volume without going too heavy.',
      exercises: [
        ['Incline push-up on bench', 'Bodyweight', '3 x 12-15'],
        ['Chest-supported dumbbell row on bench', buildWeightCue({ medium: true }), '3 x 12'],
        ['Dumbbell floor press', buildWeightCue({ medium: true }), '3 x 12'],
        ['Lateral raise', '2 x 5 kg dumbbells or lighter tempo reps', '3 x 12'],
        ['Hammer curl', '2 x 5 kg dumbbells', '3 x 12'],
      ],
      optionalExercises: [
        ['Front raise', '2 x 5 kg dumbbells', '3 x 10'],
        ['Bent-over rear-delt sweep', '2 x 5 kg dumbbells', '3 x 12'],
        ['Close-grip push-up on bench', 'Bodyweight', '3 x 10-12'],
      ],
    },
    {
      day: 'Friday',
      focus: 'Legs + Core',
      duration: '30 min',
      note: 'Second lower-body touch for weekly consistency.',
      exercises: [
        ['Bulgarian split squat using bench', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 10 each side'],
        ['Dumbbell sumo squat', strongerBase ? '1 x 10 kg dumbbell' : '1 x 5 kg dumbbell', '3 x 12-15'],
        ['Standing calf raise', 'Bodyweight', '3 x 18-20'],
        ['Mountain climbers', 'Bodyweight / mat', '3 x 30 sec'],
        ['Forearm plank', 'Bodyweight / mat', '3 x 45 sec'],
      ],
      optionalExercises: [
        ['Bench step-up', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 12 each side'],
        ['Wall sit', 'Bodyweight', '3 x 35 sec'],
        ['Side plank', 'Bodyweight / mat', '3 x 25 sec each side'],
      ],
    },
    {
      day: 'Saturday',
      focus: 'Pull + Arms',
      duration: '30 min',
      note: 'Back, rear shoulders, biceps, and posture work.',
      exercises: [
        ['One-arm dumbbell row', buildWeightCue({ heavy: true, unilateral: true }), '4 x 10-12 each side'],
        ['Rear-delt raise on bench', '2 x 5 kg dumbbells', '3 x 12'],
        ['Alternating bicep curl', '2 x 5 kg dumbbells', '3 x 12 each side'],
        ['Cross-body hammer curl', '2 x 5 kg dumbbells', '3 x 10 each side'],
        ['Superman hold', 'Bodyweight / mat', '3 x 30 sec'],
      ],
      optionalExercises: [
        ['Chest-supported row on bench', '2 x 5 kg dumbbells', '3 x 12'],
        ['Reverse snow angel', 'Bodyweight / mat', '3 x 12'],
        ['Static curl hold', '2 x 5 kg dumbbells', '3 x 20 sec'],
      ],
    },
    {
      day: 'Sunday',
      focus: 'Full Body Conditioning',
      duration: '30 min',
      note: 'Higher movement density with practical home exercises.',
      exercises: [
        ['Dumbbell thruster', '2 x 5 kg dumbbells', '3 x 12'],
        ['Push-up to shoulder tap', 'Bodyweight / push-up bars', '3 x 10 each side'],
        ['Renegade row', '2 x 5 kg dumbbells', '3 x 8 each side'],
        ['Bench step-ups', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 12 each side'],
        ['Bicycle crunch', 'Bodyweight / mat', '3 x 20 total'],
      ],
      optionalExercises: [
        ['Farmer march in place', '2 x 10 kg dumbbells or 2 x 5 kg', '3 x 30 sec'],
        ['Bear crawl hold', 'Bodyweight / mat', '3 x 20 sec'],
        ['Squat to calf raise', 'Bodyweight', '3 x 15'],
      ],
    },
  ];

  const singleSchedule = [
    {
      day: 'Monday',
      focus: 'Recovery / Off',
      duration: 'Off day',
      note: 'Walk, stretch lightly, and recover.',
      exercises: [],
    },
    {
      day: 'Tuesday',
      focus: 'Chest',
      duration: '30 min',
      note: 'Pressing focus with chest fatigue first.',
      exercises: [
        ['Flat dumbbell bench press', buildWeightCue({ heavy: strongerBase, medium: !strongerBase }), '4 x 10-12'],
        ['Dumbbell floor fly press hybrid', '2 x 5 kg dumbbells', '3 x 12'],
        ['Push-ups on bars', 'Bodyweight', '3 x 12-15'],
        ['Bench push-up burnout', 'Bodyweight', '2 x max reps'],
      ],
      optionalExercises: [
        ['Incline dumbbell squeeze press', '2 x 5 kg dumbbells', '3 x 12'],
        ['Paused push-up', 'Bodyweight', '3 x 8-10'],
        ['Isometric chest press hold', '2 x 5 kg dumbbells', '3 x 20 sec'],
      ],
    },
    {
      day: 'Wednesday',
      focus: 'Back',
      duration: '30 min',
      note: 'Rows and upper-back control.',
      exercises: [
        ['One-arm dumbbell row', buildWeightCue({ heavy: true, unilateral: true }), '4 x 12 each side'],
        ['Chest-supported row on bench', '2 x 5 kg dumbbells', '3 x 12'],
        ['Rear-delt raise', '2 x 5 kg dumbbells', '3 x 12'],
        ['Superman hold', 'Bodyweight / mat', '3 x 30 sec'],
      ],
      optionalExercises: [
        ['Prone Y raise', 'Bodyweight or 2 x 5 kg', '3 x 12'],
        ['Reverse snow angel', 'Bodyweight / mat', '3 x 12'],
        ['Suitcase hold', '1 x 10 kg dumbbell', '3 x 25 sec each side'],
      ],
    },
    {
      day: 'Thursday',
      focus: 'Legs',
      duration: '30 min',
      note: 'Lower-body strength with limited home equipment.',
      exercises: [
        ['Goblet squat', strongerBase ? '1 x 10 kg dumbbell' : '1 x 5 kg dumbbell', '4 x 12'],
        ['Romanian deadlift', buildWeightCue({ heavy: strongerBase, medium: !strongerBase }), '4 x 10-12'],
        ['Reverse lunge', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 10 each side'],
        ['Calf raise', 'Bodyweight', '3 x 20'],
      ],
      optionalExercises: [
        ['Dumbbell sumo squat', strongerBase ? '1 x 10 kg dumbbell' : '1 x 5 kg dumbbell', '3 x 15'],
        ['Wall sit', 'Bodyweight', '3 x 35 sec'],
        ['Bench step-up', strongerBase ? '2 x 5 kg dumbbells' : 'Bodyweight', '3 x 12 each side'],
      ],
    },
    {
      day: 'Friday',
      focus: 'Shoulders',
      duration: '30 min',
      note: 'Delts, posture, and shoulder endurance.',
      exercises: [
        ['Seated dumbbell shoulder press', '2 x 5 kg dumbbells', '4 x 10-12'],
        ['Lateral raise', '2 x 5 kg dumbbells', '3 x 12'],
        ['Front raise', '2 x 5 kg dumbbells', '3 x 10-12'],
        ['Pike push-up', 'Bodyweight', '3 x 8-12'],
      ],
      optionalExercises: [
        ['Arnold press', '2 x 5 kg dumbbells', '3 x 10'],
        ['Bent-over rear-delt sweep', '2 x 5 kg dumbbells', '3 x 12'],
        ['Scapular wall slide', 'Bodyweight', '3 x 12'],
      ],
    },
    {
      day: 'Saturday',
      focus: 'Arms',
      duration: '30 min',
      note: 'Biceps and triceps isolation with quick transitions.',
      exercises: [
        ['Alternating dumbbell curl', '2 x 5 kg dumbbells', '4 x 12 each side'],
        ['Hammer curl', '2 x 5 kg dumbbells', '3 x 10-12'],
        ['Bench tricep dips', 'Bodyweight', '4 x 12-15'],
        ['Overhead dumbbell tricep extension', strongerBase ? '1 x 10 kg dumbbell' : '1 x 5 kg dumbbell', '3 x 12'],
      ],
      optionalExercises: [
        ['Cross-body hammer curl', '2 x 5 kg dumbbells', '3 x 10 each side'],
        ['Close-grip push-up on bench', 'Bodyweight', '3 x 10-12'],
        ['Static curl hold', '2 x 5 kg dumbbells', '3 x 20 sec'],
      ],
    },
    {
      day: 'Sunday',
      focus: 'Core + Conditioning',
      duration: '30 min',
      note: 'Core stability plus metabolic finishers.',
      exercises: [
        ['Plank', 'Bodyweight / mat', '3 x 45 sec'],
        ['Dead bug', 'Bodyweight / mat', '3 x 12 each side'],
        ['Mountain climbers', 'Bodyweight / mat', '3 x 30 sec'],
        ['Dumbbell thruster', '2 x 5 kg dumbbells', '3 x 12'],
        ['Burpee or squat thrust', 'Bodyweight', '3 x 10'],
      ],
      optionalExercises: [
        ['Side plank', 'Bodyweight / mat', '3 x 25 sec each side'],
        ['Hollow body hold', 'Bodyweight / mat', '3 x 20 sec'],
        ['Bear crawl hold', 'Bodyweight / mat', '3 x 20 sec'],
      ],
    },
  ];

  return splitType === 'single' ? singleSchedule : combinedSchedule;
};

const exerciseGuideMap = {
  'Flat dumbbell bench press': {
    howTo: 'Lie flat on the bench, keep feet planted, press the dumbbells upward above your chest, then lower slowly until elbows come slightly below the bench line.',
    cue: 'Keep wrists straight and do not bounce at the bottom.',
    demo: 'press',
  },
  'Push-ups on bars': {
    howTo: 'Hold the push-up bars, keep your body in one straight line, lower your chest between the bars, then push back up.',
    cue: 'Tight core and no sagging hips.',
    demo: 'pushup',
  },
  'Seated dumbbell shoulder press': {
    howTo: 'Sit upright on the bench, start with dumbbells near shoulder height, press overhead, then lower back under control.',
    cue: 'Do not lean back too much.',
    demo: 'overhead',
  },
  'Bench tricep dips': {
    howTo: 'Place hands on the bench edge, slide hips forward, bend elbows to lower yourself, then press up.',
    cue: 'Keep movement small if shoulders feel strained.',
    demo: 'dip',
  },
  'Dead bug or plank': {
    howTo: 'For dead bug, lie on your back and extend opposite arm and leg slowly. For plank, hold a straight body on elbows or hands.',
    cue: 'Brace your stomach throughout.',
    demo: 'core',
  },
  'Goblet squat': {
    howTo: 'Hold one dumbbell close to your chest, sit hips back and down, then stand up strongly through your feet.',
    cue: 'Keep chest lifted and knees tracking over toes.',
    demo: 'squat',
  },
  'Romanian deadlift': {
    howTo: 'Hold dumbbells in front of thighs, push hips back with a slight knee bend, lower until you feel hamstrings, then stand tall again.',
    cue: 'Back stays flat, do not round forward.',
    demo: 'hinge',
  },
  'One-arm dumbbell row': {
    howTo: 'Support one hand and knee on the bench, pull the dumbbell toward your hip, then lower slowly.',
    cue: 'Drive elbow back, not straight up.',
    demo: 'row',
  },
  'Reverse lunges': {
    howTo: 'Step one leg back, lower both knees, then push back to standing and repeat on the other side.',
    cue: 'Front foot stays flat and stable.',
    demo: 'lunge',
  },
  'Glute bridge': {
    howTo: 'Lie on your back with knees bent, press hips upward, squeeze glutes at the top, then lower back down.',
    cue: 'Do not over-arch your lower back.',
    demo: 'bridge',
  },
  'Incline push-up on bench': {
    howTo: 'Place hands on the bench, walk feet back, lower chest toward the bench, then push up.',
    cue: 'Body stays in one straight line.',
    demo: 'pushup',
  },
  'Chest-supported dumbbell row on bench': {
    howTo: 'Lie chest-down on the bench, pull dumbbells back beside your ribs, then lower slowly.',
    cue: 'Avoid shrugging the shoulders.',
    demo: 'row',
  },
  'Dumbbell floor press': {
    howTo: 'Lie on the mat or floor, press dumbbells straight up from chest level, then lower until elbows lightly touch the floor.',
    cue: 'Keep forearms vertical.',
    demo: 'press',
  },
  'Lateral raise': {
    howTo: 'Stand tall, raise dumbbells out to the sides up to shoulder height, then lower slowly.',
    cue: 'Use control, not swinging.',
    demo: 'raise',
  },
  'Hammer curl': {
    howTo: 'Hold dumbbells with thumbs facing forward, curl upward, then lower slowly.',
    cue: 'Keep elbows close to your sides.',
    demo: 'curl',
  },
  'Bulgarian split squat using bench': {
    howTo: 'Place back foot on the bench, lower through the front leg, then stand back up.',
    cue: 'Take a long enough stance so the front knee stays comfortable.',
    demo: 'lunge',
  },
  'Standing calf raise': {
    howTo: 'Stand tall, rise onto your toes, squeeze calves, then lower slowly.',
    cue: 'Pause briefly at the top.',
    demo: 'calf',
  },
  'Mountain climbers': {
    howTo: 'Start in a plank, drive knees in one at a time in a running motion.',
    cue: 'Hands under shoulders and hips steady.',
    demo: 'mountain',
  },
  'Forearm plank': {
    howTo: 'Rest on forearms and toes, keep body straight, and hold.',
    cue: 'Squeeze glutes and keep hips level.',
    demo: 'core',
  },
  'Rear-delt raise on bench': {
    howTo: 'Lean chest onto the bench, raise dumbbells out and slightly back, then lower slowly.',
    cue: 'Small controlled reps are better than big swings.',
    demo: 'raise',
  },
  'Alternating bicep curl': {
    howTo: 'Curl one dumbbell up while the other stays down, then alternate sides.',
    cue: 'Do not rock your torso.',
    demo: 'curl',
  },
  'Cross-body hammer curl': {
    howTo: 'Curl each dumbbell diagonally toward the opposite chest side, then lower slowly.',
    cue: 'Keep movement smooth and controlled.',
    demo: 'curl',
  },
  'Superman hold': {
    howTo: 'Lie face down, raise arms and legs slightly off the mat, then hold.',
    cue: 'Lift gently, not by jamming the lower back.',
    demo: 'superman',
  },
  'Dumbbell thruster': {
    howTo: 'Hold dumbbells at shoulders, squat down, then stand and press overhead in one motion.',
    cue: 'Drive from the legs first, then press.',
    demo: 'thruster',
  },
  'Push-up to shoulder tap': {
    howTo: 'Do one push-up, then tap one shoulder with the opposite hand and switch sides.',
    cue: 'Keep hips from rocking side to side.',
    demo: 'pushup',
  },
  'Renegade row': {
    howTo: 'Start in a high plank holding dumbbells, row one dumbbell up, place it down, then switch sides.',
    cue: 'Widen your feet slightly for balance.',
    demo: 'row',
  },
  'Bench step-ups': {
    howTo: 'Step onto the bench with one foot, stand tall, step down, then repeat and switch.',
    cue: 'Push through the front heel rather than jumping.',
    demo: 'stepup',
  },
  'Bicycle crunch': {
    howTo: 'Lie on your back, bring opposite elbow and knee toward each other, then alternate sides.',
    cue: 'Move slowly enough to feel the abs working.',
    demo: 'bicycle',
  },
  'Dumbbell floor fly press hybrid': {
    howTo: 'On the floor, lower dumbbells slightly outward like a fly, then bring them in and press upward.',
    cue: 'Keep the range comfortable for your shoulders.',
    demo: 'press',
  },
  'Bench push-up burnout': {
    howTo: 'Use the bench for easier push-ups and do smooth reps until close to fatigue.',
    cue: 'Stop before form breaks completely.',
    demo: 'pushup',
  },
  'Chest-supported row on bench': {
    howTo: 'Lie chest-down on the bench and pull dumbbells toward your sides.',
    cue: 'Elbows travel back, chest stays supported.',
    demo: 'row',
  },
  'Rear-delt raise': {
    howTo: 'Bend slightly forward and lift dumbbells out to the sides for the back of the shoulders.',
    cue: 'Use light, clean reps.',
    demo: 'raise',
  },
  'Calf raise': {
    howTo: 'Rise onto your toes, hold briefly, and lower down under control.',
    cue: 'Move through a full ankle range.',
    demo: 'calf',
  },
  'Front raise': {
    howTo: 'Raise dumbbells straight in front of you to shoulder height, then lower slowly.',
    cue: 'Keep shoulders down and neck relaxed.',
    demo: 'raise',
  },
  'Pike push-up': {
    howTo: 'Start with hips high, lower your head toward the floor, then press back up.',
    cue: 'This is for shoulders, not chest.',
    demo: 'overhead',
  },
  'Overhead dumbbell tricep extension': {
    howTo: 'Hold one dumbbell overhead with both hands, bend elbows to lower behind the head, then extend.',
    cue: 'Keep elbows pointing mostly forward.',
    demo: 'overhead',
  },
  'Plank': {
    howTo: 'Hold a straight line from shoulders to heels on hands or forearms.',
    cue: 'Brace core and do not let hips sag.',
    demo: 'core',
  },
  'Dead bug': {
    howTo: 'Lie on your back and slowly extend opposite arm and leg while keeping your lower back gently pressed down.',
    cue: 'Slow control matters more than speed.',
    demo: 'core',
  },
  'Burpee or squat thrust': {
    howTo: 'Drop hands down, kick feet back, return feet in, and stand or jump lightly.',
    cue: 'Stay smooth and land softly.',
    demo: 'burpee',
  },
  'Dumbbell sumo squat': {
    howTo: 'Hold one dumbbell between your legs, take a wide stance, sit down with knees tracking outward, then stand back up.',
    cue: 'Keep the chest tall and push the floor apart with your feet.',
    demo: 'squat',
  },
  'Reverse lunge': {
    howTo: 'Step back with one foot, lower both knees under control, and drive through the front foot to return.',
    cue: 'Stay upright and keep the front knee stable.',
    demo: 'lunge',
  },
  'Alternating dumbbell curl': {
    howTo: 'Curl one dumbbell up while the other stays lowered, then alternate sides without swinging.',
    cue: 'Keep elbows pinned close to your body.',
    demo: 'curl',
  },
  'Incline dumbbell squeeze press': {
    howTo: 'Lie back with the upper back slightly elevated on the bench, press the dumbbells together as you drive them upward.',
    cue: 'Squeeze the dumbbells inward the whole time.',
    demo: 'press',
  },
  'Arnold press': {
    howTo: 'Start with palms facing you at shoulder height, rotate the dumbbells outward as you press overhead, then reverse the motion down.',
    cue: 'Move slowly so the shoulder rotation stays smooth.',
    demo: 'overhead',
  },
  'Hollow body hold': {
    howTo: 'Lie on your back, lift shoulders and legs slightly off the floor, and hold a banana-shaped position.',
    cue: 'Keep the lower back gently pressed into the mat.',
    demo: 'core',
  },
  'Bench-supported hip thrust': {
    howTo: 'Rest your upper back on the bench, drive hips upward, and squeeze the glutes at the top.',
    cue: 'Chin tucked slightly and ribs down.',
    demo: 'bridge',
  },
  'Split squat iso hold': {
    howTo: 'Drop into a split squat halfway down and hold the position without bouncing.',
    cue: 'Front shin stays mostly vertical and torso tall.',
    demo: 'lunge',
  },
  'Bird dog': {
    howTo: 'From hands and knees, reach one arm forward and the opposite leg back, then return and switch.',
    cue: 'Move slowly and keep hips square to the floor.',
    demo: 'core',
  },
  'Bent-over rear-delt sweep': {
    howTo: 'Hinge slightly at the hips and sweep the dumbbells wide and back to hit the rear shoulders.',
    cue: 'Lead with the elbows and avoid jerking the weights.',
    demo: 'raise',
  },
  'Close-grip push-up on bench': {
    howTo: 'Place hands close together on the bench, lower your chest, and press back up with elbows tucked closer in.',
    cue: 'Think triceps and keep the body in a straight line.',
    demo: 'pushup',
  },
  'Bench step-up': {
    howTo: 'Place one foot on the bench, step up to standing, then control the descent back down.',
    cue: 'Push through the front heel instead of bouncing off the back foot.',
    demo: 'stepup',
  },
  'Wall sit': {
    howTo: 'Lean your back against a wall and slide down until knees are bent, then hold the seated position.',
    cue: 'Keep knees stacked over ankles as much as possible.',
    demo: 'squat',
  },
  'Side plank': {
    howTo: 'Prop yourself on one forearm and the side of one foot, then hold your body in a straight line.',
    cue: 'Lift the hips and do not let them sag.',
    demo: 'core',
  },
  'Reverse snow angel': {
    howTo: 'Lie face down and sweep your arms from overhead toward your hips like making a snow angel.',
    cue: 'Keep the chest lightly lifted from the floor.',
    demo: 'superman',
  },
  'Static curl hold': {
    howTo: 'Curl the dumbbells halfway up and hold them there for time.',
    cue: 'Keep wrists neutral and elbows still.',
    demo: 'curl',
  },
  'Farmer march in place': {
    howTo: 'Stand tall holding dumbbells at your sides and slowly march your knees up one at a time.',
    cue: 'Stay tall and do not lean side to side.',
    demo: 'stepup',
  },
  'Bear crawl hold': {
    howTo: 'Start on hands and knees, lift knees slightly off the floor, and hold that hovering position.',
    cue: 'Back flat, knees just an inch or two up.',
    demo: 'mountain',
  },
  'Squat to calf raise': {
    howTo: 'Perform a bodyweight squat, stand up, then continue straight into a calf raise.',
    cue: 'Use a smooth flow from squat to tip-toe.',
    demo: 'squat',
  },
  'Paused push-up': {
    howTo: 'Lower into a push-up, pause for one second near the bottom, then push back up.',
    cue: 'Do not let the hips drop during the pause.',
    demo: 'pushup',
  },
  'Isometric chest press hold': {
    howTo: 'Press the dumbbells halfway up and hold them steady over the chest.',
    cue: 'Keep shoulders down and chest tight.',
    demo: 'press',
  },
  'Prone Y raise': {
    howTo: 'Lie face down and raise your arms overhead into a Y shape, then lower back slowly.',
    cue: 'Use light control rather than height.',
    demo: 'raise',
  },
  'Suitcase hold': {
    howTo: 'Stand tall holding one dumbbell at one side and resist leaning toward it.',
    cue: 'Brace the abs and stay perfectly upright.',
    demo: 'calf',
  },
  'Scapular wall slide': {
    howTo: 'Stand with your back to a wall and slide arms up and down while keeping them in contact as much as possible.',
    cue: 'Move slowly and keep ribs down.',
    demo: 'overhead',
  },
};

const StickExerciseDemo = ({ type }) => {
  const animationClass = {
    press: 'animate-exercise-press',
    pushup: 'animate-exercise-pushup',
    overhead: 'animate-exercise-overhead',
    dip: 'animate-exercise-dip',
    core: 'animate-exercise-core',
    squat: 'animate-exercise-squat',
    hinge: 'animate-exercise-hinge',
    row: 'animate-exercise-row',
    lunge: 'animate-exercise-lunge',
    bridge: 'animate-exercise-bridge',
    raise: 'animate-exercise-raise',
    curl: 'animate-exercise-curl',
    calf: 'animate-exercise-calf',
    mountain: 'animate-exercise-mountain',
    superman: 'animate-exercise-superman',
    thruster: 'animate-exercise-thruster',
    stepup: 'animate-exercise-stepup',
    bicycle: 'animate-exercise-bicycle',
    burpee: 'animate-exercise-burpee',
  }[type] || 'animate-exercise-core';

  const figure = (lines, extra = null) => (
    <>
      {extra}
      <g className={`${animationClass} text-slate-600 dark:text-white/80`} stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {lines.map((line, index) => (
          <path key={index} d={line} />
        ))}
      </g>
    </>
  );

  const frames = {
    press: figure(
      ['M30 14a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 20L35 33', 'M35 23L27 18', 'M35 23L43 18', 'M35 33L30 46', 'M35 33L40 46'],
      <>
        <rect x="12" y="30" width="46" height="7" rx="3.5" className="fill-slate-200 dark:fill-white/12" />
        <path d="M18 18L27 18M43 18L52 18" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="3" strokeLinecap="round" />
      </>,
    ),
    pushup: figure(
      ['M20 18a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 22L36 25L48 27', 'M36 25L33 36', 'M48 27L53 37', 'M33 36L24 39', 'M53 37L60 39'],
      <path d="M14 40H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    overhead: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 32', 'M35 21L28 9', 'M35 21L42 9', 'M35 32L30 46', 'M35 32L40 46'],
      <path d="M24 7H32M38 7H46" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="3" strokeLinecap="round" />,
    ),
    dip: figure(
      ['M27 14a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M31 18L31 30', 'M31 22L21 28', 'M31 22L42 24', 'M31 30L24 42', 'M31 30L39 41'],
      <>
        <rect x="15" y="24" width="10" height="4" rx="2" className="fill-slate-300 dark:fill-white/18" />
        <rect x="40" y="24" width="10" height="4" rx="2" className="fill-slate-300 dark:fill-white/18" />
      </>,
    ),
    core: figure(
      ['M18 27a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 28L38 28', 'M38 28L49 22', 'M38 28L49 34', 'M30 28L20 21', 'M30 28L20 35'],
      <path d="M10 40H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    squat: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 29', 'M35 22L27 24', 'M35 22L43 24', 'M35 29L28 37', 'M35 29L43 37', 'M28 37L22 44', 'M43 37L49 44'],
      <path d="M16 46H54" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    hinge: figure(
      ['M29 13a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M34 18L40 28', 'M40 28L46 37', 'M39 24L29 28', 'M40 28L50 26', 'M46 37L40 45', 'M46 37L53 44'],
      <path d="M22 46H56" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    row: figure(
      ['M20 14a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M24 18L33 25L45 27', 'M33 25L30 37', 'M45 27L52 38', 'M30 37L23 44', 'M52 38L58 44'],
      <>
        <rect x="10" y="17" width="18" height="4" rx="2" className="fill-slate-300 dark:fill-white/16" />
        <path d="M45 27L55 23" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="3" strokeLinecap="round" />
      </>,
    ),
    lunge: figure(
      ['M31 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M36 18L36 29', 'M36 22L29 25', 'M36 22L44 24', 'M36 29L29 38', 'M36 29L45 31', 'M29 38L22 45', 'M45 31L51 44'],
      <path d="M16 46H56" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    bridge: figure(
      ['M18 29a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 30L36 25L47 28', 'M47 28L54 21', 'M47 28L56 36', 'M31 26L22 20'],
      <path d="M10 38H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    raise: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 32', 'M35 22L25 16', 'M35 22L45 16', 'M35 32L30 46', 'M35 32L40 46'],
      <>
        <circle cx="23" cy="15" r="2" className="fill-slate-400 dark:fill-white/45" />
        <circle cx="47" cy="15" r="2" className="fill-slate-400 dark:fill-white/45" />
      </>,
    ),
    curl: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 32', 'M35 22L28 18', 'M35 22L42 18', 'M35 32L30 46', 'M35 32L40 46'],
      <>
        <path d="M28 18Q24 13 26 8" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="3" strokeLinecap="round" />
        <path d="M42 18Q46 13 44 8" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="3" strokeLinecap="round" />
      </>,
    ),
    calf: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 32', 'M35 22L28 24', 'M35 22L42 24', 'M35 32L32 44', 'M35 32L42 44'],
      <path d="M22 46H54" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    mountain: figure(
      ['M20 18a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 22L36 25L48 27', 'M36 25L31 36', 'M48 27L54 31', 'M31 36L23 41', 'M54 31L49 43'],
      <path d="M14 44H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    superman: figure(
      ['M17 23a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 24L38 25L51 23', 'M38 25L49 31', 'M38 25L49 19', 'M30 24L19 30', 'M30 24L19 18'],
      <path d="M10 38H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    thruster: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 30', 'M35 21L28 11', 'M35 21L42 11', 'M35 30L29 38', 'M35 30L41 38', 'M29 38L24 45', 'M41 38L46 45'],
      <>
        <circle cx="27" cy="10" r="2" className="fill-slate-400 dark:fill-white/45" />
        <circle cx="43" cy="10" r="2" className="fill-slate-400 dark:fill-white/45" />
      </>,
    ),
    stepup: figure(
      ['M30 12a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 18L35 30', 'M35 22L28 24', 'M35 22L42 24', 'M35 30L28 39', 'M35 30L43 33', 'M28 39L22 45', 'M43 33L49 45'],
      <rect x="42" y="34" width="14" height="10" rx="2" className="fill-slate-300 dark:fill-white/16" />,
    ),
    bicycle: figure(
      ['M18 27a4 4 0 1 1 8 0a4 4 0 1 1 -8 0', 'M25 28L36 28', 'M36 28L48 23', 'M36 28L48 34', 'M30 28L19 22', 'M30 28L18 34'],
      <path d="M10 39H62" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />,
    ),
    burpee: figure(
      ['M30 10a5 5 0 1 1 10 0a5 5 0 1 1 -10 0', 'M35 16L35 28', 'M35 20L28 24', 'M35 20L42 24', 'M35 28L29 38', 'M35 28L42 38', 'M29 38L24 45', 'M42 38L48 45'],
      <>
        <path d="M48 10L54 4M54 4L58 10" className="stroke-slate-400 dark:stroke-white/45" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 46H56" className="stroke-slate-300 dark:stroke-white/15" strokeWidth="2" />
      </>,
    ),
  };

  return (
    <div className="mt-3 inline-flex items-center rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-black/40">
      <svg width="96" height="64" viewBox="0 0 72 56" fill="none" aria-hidden="true">
        {frames[type] || frames.core}
      </svg>
    </div>
  );
};

const ExerciseInfo = ({ exercise, isOpen, onToggle }) => {
  const guide = exerciseGuideMap[exercise];
  if (!guide) return null;

  return (
    <div className="inline-flex">
      <button
        type="button"
        aria-label={`How to do ${exercise}`}
        onClick={onToggle}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border bg-white text-slate-600 outline-none transition hover:border-slate-400 hover:text-slate-900 focus:border-slate-400 focus:text-slate-900 dark:bg-black/50 dark:text-white/70 dark:hover:border-white/30 dark:hover:text-white dark:focus:border-white/30 dark:focus:text-white ${isOpen ? 'border-slate-500 text-slate-900 dark:border-white/40 dark:text-white' : 'border-slate-300 dark:border-white/15'}`}
      >
        <Info size={12} />
      </button>
    </div>
  );
};

const FitnessView = ({ fitness, profile, onAddEntry, onDeleteEntry, onGoalsChange }) => {
  const [entryDraft, setEntryDraft] = useState(createEntryDraft());
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [openExerciseKey, setOpenExerciseKey] = useState('');
  const sortedEntries = [...fitness.entries].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const timelineData = [...sortedEntries].reverse().map((entry) => ({
    label: entry.date ? format(new Date(entry.date), 'dd MMM') : '',
    weightKg: numeric(entry.weightKg),
    bodyFatPct: numeric(entry.bodyFatPct),
    waistCm: numeric(entry.waistCm),
    sleepHours: numeric(entry.sleepHours),
    steps: numeric(entry.steps),
    workoutMinutes: numeric(entry.workoutMinutes),
    restingHeartRate: numeric(entry.restingHeartRate),
  }));

  const latest = sortedEntries[0];
  const previous = sortedEntries[1];
  const latestWeight = numeric(latest?.weightKg);
  const previousWeight = numeric(previous?.weightKg);
  const weightDelta = latestWeight == null || previousWeight == null ? null : latestWeight - previousWeight;
  const averageSleep = sortedEntries.length
    ? sortedEntries.reduce((sum, entry) => sum + (numeric(entry.sleepHours) || 0), 0) / sortedEntries.length
    : null;
  const averageSteps = sortedEntries.length
    ? Math.round(sortedEntries.reduce((sum, entry) => sum + (numeric(entry.steps) || 0), 0) / sortedEntries.length)
    : null;
  const averageWorkout = sortedEntries.length
    ? Math.round(sortedEntries.reduce((sum, entry) => sum + (numeric(entry.workoutMinutes) || 0), 0) / sortedEntries.length)
    : null;
  const latestBmi = computeBmi(latest?.weightKg, profile.heightCm);
  const workoutSplitType = fitness.goals.workoutSplitType || 'combined';
  const homeGymSchedule = buildHomeGymSchedule({
    splitType: workoutSplitType,
    latestWeightKg: latest?.weightKg,
  });

  const insights = [];

  if (sortedEntries.length < 3) {
    insights.push('Add at least 3 check-ins to unlock clearer weekly trend signals.');
  }

  const targetWeight = numeric(fitness.goals.targetWeightKg);
  if (latestWeight == null || targetWeight == null) {
  } else {
    const gap = latestWeight - targetWeight;
    if (Math.abs(gap) < 0.5) insights.push('You are very close to your target weight. Keep the current rhythm steady.');
    else if (gap > 0) insights.push('Current weight is ' + gap.toFixed(1) + ' kg above the target. A consistent sleep and workout streak will matter more than single-day swings.');
    else insights.push('Current weight is ' + Math.abs(gap).toFixed(1) + ' kg below the target. Double-check whether this is intentional and healthy for you.');
  }

  const sleepTarget = numeric(fitness.goals.sleepTarget);
  if (averageSleep == null || sleepTarget == null) {
  } else if (averageSleep < sleepTarget) {
    insights.push('Average sleep is ' + averageSleep.toFixed(1) + ' hours, below your ' + fitness.goals.sleepTarget + '-hour target.');
  }

  const stepTarget = numeric(fitness.goals.stepTarget);
  if (averageSteps == null || stepTarget == null) {
  } else if (averageSteps >= stepTarget) {
    insights.push('Your average steps are meeting or beating the current daily target.');
  }

  const workoutTarget = numeric(fitness.goals.weeklyWorkoutMinutes);
  if (averageWorkout == null || workoutTarget == null) {
  } else {
    const projectedWeekly = averageWorkout * 7;
    if (projectedWeekly >= workoutTarget) {
      insights.push('At the current pace, you are on track for roughly ' + String(projectedWeekly) + ' workout minutes per week.');
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (entryDraft.date === '') return;
    onAddEntry(entryDraft);
    setEntryDraft(createEntryDraft());
  };

  return (
    <div className="space-y-6">
      <section className="life-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="life-card-label">Home gym schedule</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Your 7-day home program sits above measurements so the workout plan stays front and center.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-white/55">
              Monday stays off. The remaining 6 days are built for 30-minute sessions using your flat bench, dumbbells, mat, push-up bars, and bodyweight work.
            </p>
          </div>
          <label className="space-y-2 lg:min-w-[16rem]">
            <span className="life-card-label">Workout split</span>
            <select
              value={workoutSplitType}
              onChange={(event) => onGoalsChange('workoutSplitType', event.target.value)}
              className="life-input"
            >
              {workoutSplitOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {homeGymSchedule.map((session) => (
            <div key={session.day} className="life-soft-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="life-card-label">{session.day}</p>
                  <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white">{session.focus}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{session.note}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-[#090909] dark:text-white/80">
                  {session.duration}
                </div>
              </div>

              {session.exercises.length ? (
                <div className="mt-4">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10">
                        <th className="pb-3 pr-4">Exercise</th>
                        <th className="pb-3 pr-4">Weight</th>
                        <th className="pb-3 pr-0">Sets x reps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.exercises.flatMap(([exercise, weight, reps]) => {
                        const rowKey = `${session.day}:${exercise}`;
                        const guide = exerciseGuideMap[exercise];
                        const isOpen = openExerciseKey === rowKey;
                        return [
                            <tr key={rowKey} className="border-b border-slate-100 dark:border-white/5">
                              <td className="py-2 pr-4 font-medium text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <span>{exercise}</span>
                                  <ExerciseInfo
                                    exercise={exercise}
                                    isOpen={isOpen}
                                    onToggle={() => setOpenExerciseKey((current) => (current === rowKey ? '' : rowKey))}
                                  />
                                </div>
                              </td>
                              <td className="py-2 pr-4 text-slate-500 dark:text-white/55">{weight}</td>
                              <td className="py-2 pr-0 text-slate-500 dark:text-white/55">{reps}</td>
                            </tr>,
                            isOpen && guide ? (
                              <tr key={`${rowKey}:guide`} className="border-b border-slate-100 dark:border-white/5">
                                <td colSpan={3} className="pb-3 pr-0 pt-0">
                                  <div className="rounded-[1rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#090909]">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                      <div className="max-w-[34rem]">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{exercise}</p>
                                        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/75">{guide.howTo}</p>
                                        <p className="mt-2 text-sm text-slate-500 dark:text-white/55">Tip: {guide.cue}</p>
                                      </div>
                                      <StickExerciseDemo type={guide.demo} />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null,
                          ];
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-4 rounded-[1rem] border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-white/55">
                  Full rest day. Optional light walk + 8 to 10 minutes of stretching.
                </div>
              )}

              {session.optionalExercises?.length ? (
                <div className="mt-5 rounded-[1rem] border border-dashed border-slate-200 px-4 py-4 dark:border-white/10">
                  <p className="life-card-label">Optional swaps</p>
                  <div className="mt-3 grid gap-2">
                    {session.optionalExercises.map(([exercise, weight, reps]) => {
                      const rowKey = `${session.day}:optional:${exercise}`;
                      const guide = exerciseGuideMap[exercise];
                      const isOpen = openExerciseKey === rowKey;
                      return (
                        <div key={rowKey} className="rounded-[0.9rem] bg-slate-50 px-3 py-3 text-sm dark:bg-[#090909]">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                              <span className="font-medium">{exercise}</span>
                              {guide ? (
                                <ExerciseInfo
                                  exercise={exercise}
                                  isOpen={isOpen}
                                  onToggle={() => setOpenExerciseKey((current) => (current === rowKey ? '' : rowKey))}
                                />
                              ) : null}
                            </div>
                            <div className="text-slate-500 dark:text-white/55">{weight}</div>
                            <div className="text-slate-500 dark:text-white/55">{reps}</div>
                          </div>
                          {isOpen && guide ? (
                            <div className="mt-3 rounded-[0.9rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#050505]">
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="max-w-[34rem]">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{exercise}</p>
                                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-white/75">{guide.howTo}</p>
                                  <p className="mt-2 text-sm text-slate-500 dark:text-white/55">Tip: {guide.cue}</p>
                                </div>
                                <StickExerciseDemo type={guide.demo} />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr,1.08fr]">
        <section className="life-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-500/12 p-3 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                <Scale size={18} />
              </div>
              <div>
                <p className="life-card-label">Add a check-in</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  Core vitals first, advanced measurements only when you need them
                </h2>
              </div>
            </div>

            <button type="button" onClick={() => setShowAdvancedFields((current) => !current)} className="life-secondary-button">
              {showAdvancedFields ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showAdvancedFields ? 'Hide advanced' : 'Show advanced'}
            </button>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Date', 'date', 'date'],
                ['Weight (kg)', 'weightKg', 'number'],
                ['Waist (cm)', 'waistCm', 'number'],
                ['Steps', 'steps', 'number'],
                ['Sleep (hours)', 'sleepHours', 'number'],
                ['Workout Minutes', 'workoutMinutes', 'number'],
                ['Resting HR', 'restingHeartRate', 'number'],
              ].map(([label, key, type]) => (
                <label key={key} className="space-y-2">
                  <span className="life-card-label">{label}</span>
                  <input
                    type={type}
                    value={entryDraft[key]}
                    onChange={(event) => setEntryDraft((current) => ({ ...current, [key]: event.target.value }))}
                    className="life-input"
                  />
                </label>
              ))}
            </div>
            {showAdvancedFields ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#090909] md:grid-cols-2">
                {[
                  ['Body Fat (%)', 'bodyFatPct', 'number'],
                  ['Chest (cm)', 'chestCm', 'number'],
                  ['Hip (cm)', 'hipCm', 'number'],
                  ['Water (liters)', 'waterLiters', 'number'],
                ].map(([label, key, type]) => (
                  <label key={key} className="space-y-2">
                    <span className="life-card-label">{label}</span>
                    <input
                      type={type}
                      value={entryDraft[key]}
                      onChange={(event) => setEntryDraft((current) => ({ ...current, [key]: event.target.value }))}
                      className="life-input"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <label className="space-y-2">
              <span className="life-card-label">Notes</span>
              <textarea
                value={entryDraft.note}
                onChange={(event) => setEntryDraft((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                placeholder="Workout quality, soreness, food notes, stress, travel, or anything important..."
                className="life-textarea"
              />
            </label>
            <button type="submit" className="life-primary-button w-full justify-center">
              Save check-in
            </button>
          </form>
        </section>

        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="life-card-label">Targets</p>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Keep your current targets visible.
              </h3>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ['Target Weight (kg)', 'targetWeightKg'],
              ['Weekly Workout Minutes', 'weeklyWorkoutMinutes'],
              ['Daily Step Target', 'stepTarget'],
              ['Sleep Target (hours)', 'sleepTarget'],
              ['Workout split', 'workoutSplitType'],
            ].map(([label, key]) => (
              <label key={key} className="space-y-2">
                <span className="life-card-label">{label}</span>
                {key === 'workoutSplitType' ? (
                  <select
                    value={fitness.goals[key]}
                    onChange={(event) => onGoalsChange(key, event.target.value)}
                    className="life-input"
                  >
                    {workoutSplitOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={fitness.goals[key]}
                    onChange={(event) => onGoalsChange(key, event.target.value)}
                    className="life-input"
                  />
                )}
              </label>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { title: 'Latest weight', value: formatMetric(latest?.weightKg, ' kg'), help: weightDelta == null ? 'Add more than one entry to see the change.' : (weightDelta > 0 ? '+' : '') + weightDelta.toFixed(1) + ' kg vs previous', icon: Scale },
              { title: 'Latest BMI', value: latestBmi ? latestBmi.toFixed(1) : 'Not set', help: profile.heightCm ? 'Based on height ' + profile.heightCm + ' cm' : 'Add your height in About Me for BMI.', icon: Activity },
              { title: 'Avg sleep', value: averageSleep ? averageSleep.toFixed(1) + ' h' : 'Not set', help: 'Average across your stored check-ins', icon: BedDouble },
              { title: 'Avg steps', value: averageSteps ? averageSteps.toLocaleString() : 'Not set', help: 'Average daily steps from your entries', icon: Footprints },
            ].map((card) => (
              <div key={card.title} className="life-soft-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">{card.help}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                    <card.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="life-panel">
          <div>
            <p className="life-card-label">Body trends</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Weight, waist, and body-fat trend</h3>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="weight" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="body" orientation="right" stroke="rgba(100, 116, 139, 0.6)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '18px',
                  }}
                />
                <Line yAxisId="weight" type="monotone" dataKey="weightKg" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                <Line yAxisId="body" type="monotone" dataKey="bodyFatPct" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2 }} />
                <Bar yAxisId="body" dataKey="waistCm" fill="rgba(59, 130, 246, 0.28)" radius={[10, 10, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="life-panel">
          <div>
            <p className="life-card-label">Recovery and activity</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Sleep, steps, and workout load</h3>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis dataKey="label" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="activity" stroke="rgba(100, 116, 139, 0.6)" />
                <YAxis yAxisId="sleep" orientation="right" stroke="rgba(100, 116, 139, 0.6)" />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.92)',
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: '18px',
                  }}
                />
                <Bar yAxisId="activity" dataKey="steps" fill="rgba(6, 182, 212, 0.35)" radius={[10, 10, 0, 0]} />
                <Line yAxisId="sleep" type="monotone" dataKey="sleepHours" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line yAxisId="activity" type="monotone" dataKey="workoutMinutes" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="life-panel">
          <p className="life-card-label">Insights</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Quick read of your current trajectory</h3>
          <div className="mt-6 grid gap-4">
            {insights.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
                  Add a few more entries or set your targets to generate specific observations here.
                </p>
              </div>
            ) : (
              insights.map((insight) => (
                <div key={insight} className="life-soft-card">
                  <p className="text-sm leading-6 text-slate-700 dark:text-white/70">{insight}</p>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              { title: 'Resting HR', value: formatMetric(latest?.restingHeartRate, ' bpm'), icon: HeartPulse },
              { title: 'Water', value: formatMetric(latest?.waterLiters, ' L'), icon: Droplets },
              { title: 'Workout minutes', value: latest?.workoutMinutes ? latest.workoutMinutes + ' min' : 'Not set', icon: TimerReset },
              { title: 'Sleep hours', value: latest?.sleepHours ? latest.sleepHours + ' h' : 'Not set', icon: Waves },
            ].map((card) => (
              <div key={card.title} className="life-soft-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="life-card-label">{card.title}</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{card.value}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
                    <card.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="life-panel">
          <p className="life-card-label">Recent entries</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Your latest measurement history</h3>
          <div className="mt-6 overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Weight</th>
                  <th>Waist</th>
                  <th>Sleep</th>
                  <th>Steps</th>
                  <th>Workout</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-slate-500 dark:text-white/50">No fitness data yet.</td>
                  </tr>
                ) : (
                  sortedEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : 'No date'}</td>
                      <td>{entry.weightKg ? entry.weightKg + ' kg' : '—'}</td>
                      <td>{entry.waistCm ? entry.waistCm + ' cm' : '—'}</td>
                      <td>{entry.sleepHours ? entry.sleepHours + ' h' : '—'}</td>
                      <td>{entry.steps || '—'}</td>
                      <td>{entry.workoutMinutes ? entry.workoutMinutes + ' min' : '—'}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteEntry(entry.id)}
                          className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FitnessView;
