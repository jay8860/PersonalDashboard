import { useState } from 'react';
import { format } from 'date-fns';
import { Activity, Info, Scale, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
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
  weightValue: '',
  weightUnit: 'kg',
  heightValue: '',
  heightUnit: 'cm',
  waistValue: '',
  aboveNavelValue: '',
  bicepValue: '',
  chestValue: '',
  hipValue: '',
  thighValue: '',
  bodyMeasurementUnit: 'cm',
  note: '',
});

const numeric = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toKg = (weightValue, weightUnit) => {
  const weight = numeric(weightValue);
  if (weight == null) return null;
  return weightUnit === 'lb' ? weight * 0.45359237 : weight;
};

const toCm = (value, unit) => {
  const parsed = numeric(value);
  if (parsed == null) return null;
  if (unit === 'in') return parsed * 2.54;
  return parsed;
};

const computeBmi = (weightValue, weightUnit, heightValue, heightUnit) => {
  const weight = toKg(weightValue, weightUnit);
  const height = toCm(heightValue, heightUnit);
  if (weight == null || height == null || height === 0) return null;
  const meters = height / 100;
  return weight / (meters * meters);
};

const formatMeasurement = (value, unit) => {
  const parsed = numeric(value);
  if (parsed == null) return 'Not set';
  return `${parsed.toFixed(1)} ${unit}`;
};

const changeSummary = (latestValue, previousValue, unit) => {
  const latest = numeric(latestValue);
  const previous = numeric(previousValue);
  if (latest == null || previous == null) return 'Add one more check-in to see change.';
  const diff = latest - previous;
  if (Math.abs(diff) < 0.05) return `Stable vs previous (${latest.toFixed(1)} ${unit}).`;
  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit} vs previous`;
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
    demo: 'deadbug',
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
    demo: 'plank',
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
    demo: 'plank',
  },
  'Dead bug': {
    howTo: 'Lie on your back and slowly extend opposite arm and leg while keeping your lower back gently pressed down.',
    cue: 'Slow control matters more than speed.',
    demo: 'deadbug',
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
    demo: 'hollow',
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
    demo: 'birddog',
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
    demo: 'sideplank',
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
  const softStroke = 'rgba(100,116,139,0.34)';
  const hardStroke = 'currentColor';
  const skinFill = 'rgba(241, 245, 249, 0.96)';
  const floor = <path d="M18 106H182" stroke="rgba(148,163,184,0.45)" strokeWidth="3" strokeLinecap="round" />;
  const benchFlat = (
    <>
      <rect x="54" y="72" width="76" height="10" rx="5" className="fill-slate-300 dark:fill-white/16" />
      <path d="M66 82L60 104M118 82L124 104" stroke="rgba(148,163,184,0.7)" strokeWidth="3" strokeLinecap="round" />
    </>
  );
  const benchIncline = (
    <>
      <path d="M60 80L114 62" stroke="rgba(148,163,184,0.8)" strokeWidth="10" strokeLinecap="round" />
      <path d="M76 75L68 103M106 65L116 103" stroke="rgba(148,163,184,0.7)" strokeWidth="3" strokeLinecap="round" />
    </>
  );
  const stepBlock = <rect x="124" y="74" width="40" height="22" rx="4" className="fill-slate-300 dark:fill-white/16" />;
  const bars = (
    <>
      <rect x="40" y="72" width="10" height="16" rx="4" className="fill-slate-300 dark:fill-white/16" />
      <rect x="118" y="72" width="10" height="16" rx="4" className="fill-slate-300 dark:fill-white/16" />
    </>
  );

  const drawDumbbell = (x, y, rotate = 0, dim = false) => (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`} opacity={dim ? 0.45 : 1}>
      <rect x="-8" y="-2" width="16" height="4" rx="2" className="fill-slate-500 dark:fill-white/55" />
      <rect x="-12" y="-4.5" width="4" height="9" rx="2" className="fill-slate-500 dark:fill-white/55" />
      <rect x="8" y="-4.5" width="4" height="9" rx="2" className="fill-slate-500 dark:fill-white/55" />
    </g>
  );

  const drawArrow = (x1, y1, x2, y2) => (
    <g stroke="rgba(59,130,246,0.9)" strokeWidth="2.4" strokeLinecap="round" fill="none">
      <path d={`M${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - 10} ${x2} ${y2}`} strokeDasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="20;0" dur="1.2s" repeatCount="indefinite" />
      </path>
      <path d={`M${x2 - 4} ${y2 - 5}L${x2} ${y2}L${x2 - 6} ${y2 + 2}`} />
    </g>
  );

  const drawPose = (pose, { ghost = false, dumbbells = [] } = {}) => {
    const opacity = ghost ? 0.28 : 1;
    const stroke = ghost ? softStroke : hardStroke;
    return (
      <g opacity={opacity}>
        <circle cx={pose.head[0]} cy={pose.head[1]} r="8.5" fill={ghost ? 'rgba(241,245,249,0.36)' : skinFill} className="dark:fill-[rgba(226,232,240,0.92)]" stroke={stroke} strokeWidth="2.2" />
        <path d={`M${pose.neck[0]} ${pose.neck[1]}L${pose.hip[0]} ${pose.hip[1]}`} stroke={stroke} strokeWidth="10" strokeLinecap="round" />
        <path d={`M${pose.neck[0]} ${pose.neck[1]}L${pose.elbowL[0]} ${pose.elbowL[1]}L${pose.handL[0]} ${pose.handL[1]}`} stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${pose.neck[0]} ${pose.neck[1]}L${pose.elbowR[0]} ${pose.elbowR[1]}L${pose.handR[0]} ${pose.handR[1]}`} stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${pose.hip[0]} ${pose.hip[1]}L${pose.kneeL[0]} ${pose.kneeL[1]}L${pose.footL[0]} ${pose.footL[1]}`} stroke={stroke} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${pose.hip[0]} ${pose.hip[1]}L${pose.kneeR[0]} ${pose.kneeR[1]}L${pose.footR[0]} ${pose.footR[1]}`} stroke={stroke} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        {dumbbells.includes('left') ? drawDumbbell(pose.handL[0], pose.handL[1], pose.dbRotateL || 0, ghost) : null}
        {dumbbells.includes('right') ? drawDumbbell(pose.handR[0], pose.handR[1], pose.dbRotateR || 0, ghost) : null}
      </g>
    );
  };

  const makeScene = ({ setup, start, end, dumbbells = [] }) => (
    <>
      {setup}
      {drawPose(end, { ghost: true, dumbbells })}
      <g>
        <animate attributeName="opacity" values="1;1;0;0;1" dur="1.8s" repeatCount="indefinite" />
        {drawPose(start, { dumbbells })}
      </g>
      <g opacity="0">
        <animate attributeName="opacity" values="0;0;1;1;0" dur="1.8s" repeatCount="indefinite" />
        {drawPose(end, { dumbbells })}
      </g>
      {drawArrow(start.handL[0], start.handL[1], end.handL[0], end.handL[1])}
      {drawArrow(start.handR[0], start.handR[1], end.handR[0], end.handR[1])}
    </>
  );

  const scenes = {
    press: makeScene({
      setup: <>{floor}{benchIncline}</>,
      dumbbells: ['left', 'right'],
      start: { head: [64, 57], neck: [72, 64], hip: [103, 76], elbowL: [82, 56], handL: [92, 48], elbowR: [82, 70], handR: [92, 82], kneeL: [126, 82], footL: [150, 92], kneeR: [126, 82], footR: [152, 102], dbRotateL: 8, dbRotateR: 8 },
      end: { head: [64, 57], neck: [72, 64], hip: [103, 76], elbowL: [78, 46], handL: [84, 28], elbowR: [92, 68], handR: [98, 50], kneeL: [126, 82], footL: [150, 92], kneeR: [126, 82], footR: [152, 102], dbRotateL: 90, dbRotateR: 90 },
    }),
    overhead: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [84, 38], handL: [78, 48], elbowR: [116, 38], handR: [122, 48], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 20], handL: [90, 8], elbowR: [110, 20], handR: [110, 8], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 0, dbRotateR: 0 },
    }),
    pushup: makeScene({
      setup: floor,
      start: { head: [50, 50], neck: [58, 56], hip: [100, 60], elbowL: [66, 62], handL: [68, 82], elbowR: [66, 62], handR: [68, 82], kneeL: [132, 68], footL: [160, 86], kneeR: [132, 68], footR: [160, 86] },
      end: { head: [56, 38], neck: [66, 44], hip: [106, 48], elbowL: [74, 50], handL: [72, 82], elbowR: [74, 50], handR: [72, 82], kneeL: [136, 54], footL: [162, 86], kneeR: [136, 54], footR: [162, 86] },
    }),
    dip: makeScene({
      setup: <>{floor}{bars}</>,
      start: { head: [86, 42], neck: [86, 50], hip: [86, 72], elbowL: [62, 62], handL: [44, 78], elbowR: [110, 62], handR: [124, 78], kneeL: [98, 86], footL: [116, 104], kneeR: [98, 86], footR: [118, 104] },
      end: { head: [86, 54], neck: [86, 62], hip: [86, 80], elbowL: [64, 74], handL: [44, 78], elbowR: [108, 74], handR: [124, 78], kneeL: [100, 92], footL: [118, 104], kneeR: [100, 92], footR: [120, 104] },
    }),
    plank: makeScene({
      setup: floor,
      start: { head: [56, 48], neck: [66, 54], hip: [108, 58], elbowL: [72, 60], handL: [74, 78], elbowR: [72, 60], handR: [74, 78], kneeL: [136, 64], footL: [162, 82], kneeR: [136, 64], footR: [162, 82] },
      end: { head: [56, 48], neck: [66, 54], hip: [108, 56], elbowL: [72, 60], handL: [74, 78], elbowR: [72, 60], handR: [74, 78], kneeL: [136, 62], footL: [162, 82], kneeR: [136, 62], footR: [162, 82] },
    }),
    deadbug: makeScene({
      setup: floor,
      start: { head: [48, 78], neck: [58, 78], hip: [100, 78], elbowL: [46, 62], handL: [36, 48], elbowR: [66, 72], handR: [78, 78], kneeL: [118, 66], footL: [138, 52], kneeR: [120, 88], footR: [144, 98] },
      end: { head: [48, 78], neck: [58, 78], hip: [100, 78], elbowL: [48, 76], handL: [32, 78], elbowR: [72, 56], handR: [90, 40], kneeL: [118, 90], footL: [138, 100], kneeR: [122, 66], footR: [150, 52] },
    }),
    hollow: makeScene({
      setup: floor,
      start: { head: [48, 76], neck: [58, 76], hip: [98, 80], elbowL: [42, 64], handL: [30, 54], elbowR: [42, 64], handR: [30, 54], kneeL: [126, 70], footL: [152, 58], kneeR: [126, 70], footR: [152, 58] },
      end: { head: [48, 74], neck: [58, 74], hip: [98, 78], elbowL: [44, 60], handL: [30, 46], elbowR: [44, 60], handR: [30, 46], kneeL: [128, 66], footL: [156, 50], kneeR: [128, 66], footR: [156, 50] },
    }),
    birddog: makeScene({
      setup: floor,
      start: { head: [74, 50], neck: [82, 58], hip: [114, 66], elbowL: [70, 72], handL: [56, 84], elbowR: [96, 56], handR: [112, 48], kneeL: [116, 82], footL: [106, 98], kneeR: [136, 62], footR: [154, 54] },
      end: { head: [74, 50], neck: [82, 58], hip: [114, 66], elbowL: [68, 58], handL: [50, 48], elbowR: [96, 72], handR: [112, 84], kneeL: [116, 62], footL: [98, 50], kneeR: [136, 82], footR: [148, 98] },
    }),
    sideplank: makeScene({
      setup: floor,
      start: { head: [64, 70], neck: [72, 70], hip: [108, 70], elbowL: [72, 80], handL: [64, 96], elbowR: [88, 56], handR: [98, 42], kneeL: [138, 70], footL: [162, 70], kneeR: [138, 70], footR: [162, 70] },
      end: { head: [64, 66], neck: [72, 66], hip: [108, 66], elbowL: [72, 80], handL: [64, 96], elbowR: [88, 52], handR: [100, 36], kneeL: [138, 66], footL: [162, 66], kneeR: [138, 66], footR: [162, 66] },
    }),
    squat: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 44], handL: [82, 60], elbowR: [110, 44], handR: [118, 60], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [100, 34], neck: [100, 42], hip: [100, 68], elbowL: [90, 46], handL: [82, 60], elbowR: [110, 46], handR: [118, 60], kneeL: [82, 86], footL: [74, 104], kneeR: [118, 86], footR: [126, 104], dbRotateL: 90, dbRotateR: 90 },
    }),
    hinge: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 46], handL: [86, 66], elbowR: [110, 46], handR: [114, 66], kneeL: [92, 82], footL: [84, 104], kneeR: [108, 82], footR: [116, 104], dbRotateL: 0, dbRotateR: 0 },
      end: { head: [108, 38], neck: [114, 46], hip: [100, 62], elbowL: [106, 58], handL: [104, 76], elbowR: [122, 56], handR: [126, 76], kneeL: [96, 84], footL: [86, 104], kneeR: [110, 84], footR: [120, 104], dbRotateL: 0, dbRotateR: 0 },
    }),
    row: makeScene({
      setup: <>{floor}{benchFlat}</>,
      dumbbells: ['right'],
      start: { head: [60, 52], neck: [72, 58], hip: [104, 72], elbowL: [64, 66], handL: [54, 80], elbowR: [116, 68], handR: [126, 84], kneeL: [136, 76], footL: [156, 90], kneeR: [136, 76], footR: [154, 100], dbRotateR: 90 },
      end: { head: [60, 52], neck: [72, 58], hip: [104, 72], elbowL: [64, 66], handL: [54, 80], elbowR: [102, 60], handR: [112, 52], kneeL: [136, 76], footL: [156, 90], kneeR: [136, 76], footR: [154, 100], dbRotateR: 25 },
    }),
    lunge: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [96, 24], neck: [96, 32], hip: [96, 58], elbowL: [84, 42], handL: [78, 60], elbowR: [108, 42], handR: [114, 60], kneeL: [82, 82], footL: [74, 104], kneeR: [122, 72], footR: [136, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [98, 30], neck: [98, 38], hip: [98, 64], elbowL: [86, 46], handL: [80, 64], elbowR: [110, 46], handR: [116, 64], kneeL: [82, 86], footL: [72, 104], kneeR: [128, 82], footR: [148, 102], dbRotateL: 90, dbRotateR: 90 },
    }),
    bridge: makeScene({
      setup: floor,
      start: { head: [54, 82], neck: [64, 82], hip: [108, 84], elbowL: [52, 88], handL: [44, 98], elbowR: [52, 88], handR: [44, 98], kneeL: [132, 74], footL: [154, 100], kneeR: [132, 74], footR: [154, 100] },
      end: { head: [54, 82], neck: [64, 82], hip: [108, 62], elbowL: [52, 88], handL: [44, 98], elbowR: [52, 88], handR: [44, 98], kneeL: [132, 72], footL: [154, 100], kneeR: [132, 72], footR: [154, 100] },
    }),
    raise: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 44], handL: [82, 60], elbowR: [110, 44], handR: [118, 60], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [82, 32], handL: [66, 34], elbowR: [118, 32], handR: [134, 34], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 0, dbRotateR: 0 },
    }),
    curl: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 44], handL: [84, 68], elbowR: [110, 44], handR: [116, 68], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 44], handL: [84, 42], elbowR: [110, 44], handR: [116, 42], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 0, dbRotateR: 0 },
    }),
    calf: makeScene({
      setup: floor,
      start: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 44], handL: [84, 60], elbowR: [110, 44], handR: [116, 60], kneeL: [92, 82], footL: [84, 104], kneeR: [108, 82], footR: [116, 104] },
      end: { head: [100, 20], neck: [100, 28], hip: [100, 54], elbowL: [90, 40], handL: [84, 56], elbowR: [110, 40], handR: [116, 56], kneeL: [92, 78], footL: [88, 104], kneeR: [108, 78], footR: [120, 104] },
    }),
    mountain: makeScene({
      setup: floor,
      start: { head: [58, 44], neck: [68, 50], hip: [110, 56], elbowL: [72, 62], handL: [72, 84], elbowR: [72, 62], handR: [72, 84], kneeL: [128, 64], footL: [140, 82], kneeR: [128, 70], footR: [156, 86] },
      end: { head: [58, 44], neck: [68, 50], hip: [110, 56], elbowL: [72, 62], handL: [72, 84], elbowR: [72, 62], handR: [72, 84], kneeL: [108, 70], footL: [94, 88], kneeR: [132, 66], footR: [156, 86] },
    }),
    superman: makeScene({
      setup: floor,
      start: { head: [54, 82], neck: [64, 82], hip: [104, 82], elbowL: [50, 82], handL: [36, 82], elbowR: [50, 82], handR: [36, 82], kneeL: [130, 82], footL: [152, 82], kneeR: [130, 82], footR: [152, 82] },
      end: { head: [54, 74], neck: [64, 74], hip: [104, 74], elbowL: [48, 66], handL: [34, 58], elbowR: [48, 66], handR: [34, 58], kneeL: [132, 68], footL: [156, 60], kneeR: [132, 68], footR: [156, 60] },
    }),
    thruster: makeScene({
      setup: floor,
      dumbbells: ['left', 'right'],
      start: { head: [100, 34], neck: [100, 42], hip: [100, 68], elbowL: [88, 48], handL: [80, 62], elbowR: [112, 48], handR: [120, 62], kneeL: [84, 86], footL: [76, 104], kneeR: [116, 86], footR: [124, 104], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [100, 24], neck: [100, 32], hip: [100, 58], elbowL: [90, 20], handL: [90, 8], elbowR: [110, 20], handR: [110, 8], kneeL: [92, 82], footL: [86, 104], kneeR: [108, 82], footR: [114, 104], dbRotateL: 0, dbRotateR: 0 },
    }),
    stepup: makeScene({
      setup: <>{floor}{stepBlock}</>,
      dumbbells: ['left', 'right'],
      start: { head: [88, 24], neck: [88, 32], hip: [88, 58], elbowL: [78, 44], handL: [72, 62], elbowR: [98, 44], handR: [104, 62], kneeL: [82, 82], footL: [78, 104], kneeR: [104, 72], footR: [136, 74], dbRotateL: 90, dbRotateR: 90 },
      end: { head: [110, 18], neck: [110, 26], hip: [110, 52], elbowL: [100, 38], handL: [94, 56], elbowR: [120, 38], handR: [126, 56], kneeL: [104, 76], footL: [136, 76], kneeR: [122, 74], footR: [146, 76], dbRotateL: 90, dbRotateR: 90 },
    }),
    bicycle: makeScene({
      setup: floor,
      start: { head: [50, 78], neck: [58, 76], hip: [102, 78], elbowL: [54, 64], handL: [66, 54], elbowR: [62, 78], handR: [76, 78], kneeL: [120, 66], footL: [146, 52], kneeR: [120, 88], footR: [150, 98] },
      end: { head: [50, 78], neck: [58, 76], hip: [102, 78], elbowL: [54, 78], handL: [66, 78], elbowR: [62, 64], handR: [76, 54], kneeL: [120, 88], footL: [146, 98], kneeR: [120, 66], footR: [150, 52] },
    }),
    burpee: makeScene({
      setup: floor,
      start: { head: [82, 32], neck: [82, 40], hip: [82, 62], elbowL: [72, 48], handL: [66, 64], elbowR: [92, 48], handR: [98, 64], kneeL: [72, 82], footL: [58, 102], kneeR: [92, 82], footR: [108, 102] },
      end: { head: [56, 46], neck: [66, 52], hip: [108, 56], elbowL: [72, 64], handL: [72, 86], elbowR: [72, 64], handR: [72, 86], kneeL: [132, 62], footL: [148, 80], kneeR: [132, 68], footR: [160, 86] },
    }),
  };

  return (
    <div className="mt-3 inline-flex items-center rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-black/40">
      <svg width="176" height="112" viewBox="0 0 200 112" fill="none" aria-hidden="true" className="text-slate-700 dark:text-white">
        {scenes[type] || scenes.plank}
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
  const [openExerciseKey, setOpenExerciseKey] = useState('');
  const sortedEntries = [...fitness.entries].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const timelineData = [...sortedEntries].reverse().map((entry) => ({
    label: entry.date ? format(new Date(entry.date), 'dd MMM') : '',
    weight: toKg(entry.weightValue, entry.weightUnit),
    waist: toCm(entry.waistValue, entry.bodyMeasurementUnit),
    aboveNavel: toCm(entry.aboveNavelValue, entry.bodyMeasurementUnit),
    bicep: toCm(entry.bicepValue, entry.bodyMeasurementUnit),
    chest: toCm(entry.chestValue, entry.bodyMeasurementUnit),
    hip: toCm(entry.hipValue, entry.bodyMeasurementUnit),
    thigh: toCm(entry.thighValue, entry.bodyMeasurementUnit),
    bmi: computeBmi(entry.weightValue, entry.weightUnit, entry.heightValue || profile.heightCm, entry.heightUnit || 'cm'),
  }));

  const latest = sortedEntries[0];
  const previous = sortedEntries[1];
  const latestWeightKg = toKg(latest?.weightValue, latest?.weightUnit);
  const previousWeightKg = toKg(previous?.weightValue, previous?.weightUnit);
  const latestBmi = computeBmi(latest?.weightValue, latest?.weightUnit, latest?.heightValue || profile.heightCm, latest?.heightUnit || 'cm');
  const workoutSplitType = fitness.goals.workoutSplitType || 'combined';
  const homeGymSchedule = buildHomeGymSchedule({
    splitType: workoutSplitType,
    latestWeightKg,
  });

  const insights = [];

  if (sortedEntries.length < 3) {
    insights.push('Add at least 3 body check-ins to unlock clearer measurement trends.');
  }

  const waistNow = toCm(latest?.waistValue, latest?.bodyMeasurementUnit);
  const waistPrev = toCm(previous?.waistValue, previous?.bodyMeasurementUnit);
  if (waistNow != null && waistPrev != null) {
    if (waistNow < waistPrev) insights.push(`Waist is down ${(waistPrev - waistNow).toFixed(1)} cm vs previous. That usually supports leaning-out progress.`);
    else if (waistNow > waistPrev) insights.push(`Waist is up ${(waistNow - waistPrev).toFixed(1)} cm vs previous. Check whether this is bloat, food timing, or slipping consistency.`);
  }

  const bicepNow = toCm(latest?.bicepValue, latest?.bodyMeasurementUnit);
  const bicepPrev = toCm(previous?.bicepValue, previous?.bodyMeasurementUnit);
  if (bicepNow != null && bicepPrev != null && waistNow != null && waistPrev != null) {
    if (bicepNow >= bicepPrev && waistNow <= waistPrev) {
      insights.push('Bicep is stable or up while waist is stable or down. That is a good muscle-retention or recomposition signal.');
    }
  }

  if (latestBmi != null) {
    if (latestBmi < 18.5) insights.push(`BMI is ${latestBmi.toFixed(1)}. Make sure your weight trend is intentional and not drifting too low.`);
    else if (latestBmi >= 25) insights.push(`BMI is ${latestBmi.toFixed(1)}. Use waist and above-navel trend with it rather than BMI alone.`);
  }

  const upperStomachNow = toCm(latest?.aboveNavelValue, latest?.bodyMeasurementUnit);
  const upperStomachPrev = toCm(previous?.aboveNavelValue, previous?.bodyMeasurementUnit);
  if (upperStomachNow != null && upperStomachPrev != null && Math.abs(upperStomachNow - upperStomachPrev) >= 0.5) {
    insights.push(`Above-navel size is ${upperStomachNow < upperStomachPrev ? 'down' : 'up'} ${Math.abs(upperStomachNow - upperStomachPrev).toFixed(1)} cm vs previous.`);
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

      <div className="grid gap-6 xl:grid-cols-[1.02fr,0.98fr]">
        <section className="life-panel">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-white">
              <Scale size={18} />
            </div>
            <div>
              <p className="life-card-label">Body check-in</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Keep only the measurements that matter.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/55">
                BMI is calculated automatically from your weight and height. Body measurements can be tracked in either centimeters or inches.
              </p>
            </div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['Date', 'date', 'date'],
                ['Weight', 'weightValue', 'number'],
                ['Height', 'heightValue', 'number'],
                ['Waist', 'waistValue', 'number'],
                ['Above navel', 'aboveNavelValue', 'number'],
                ['Bicep', 'bicepValue', 'number'],
                ['Chest', 'chestValue', 'number'],
                ['Hip', 'hipValue', 'number'],
                ['Thigh', 'thighValue', 'number'],
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
              <label className="space-y-2">
                <span className="life-card-label">Weight unit</span>
                <select
                  value={entryDraft.weightUnit}
                  onChange={(event) => setEntryDraft((current) => ({ ...current, weightUnit: event.target.value }))}
                  className="life-input"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Height unit</span>
                <select
                  value={entryDraft.heightUnit}
                  onChange={(event) => setEntryDraft((current) => ({ ...current, heightUnit: event.target.value }))}
                  className="life-input"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="life-card-label">Body measurement unit</span>
                <select
                  value={entryDraft.bodyMeasurementUnit}
                  onChange={(event) => setEntryDraft((current) => ({ ...current, bodyMeasurementUnit: event.target.value }))}
                  className="life-input"
                >
                  <option value="cm">cm</option>
                  <option value="in">in</option>
                </select>
              </label>
            </div>
            <label className="space-y-2">
              <span className="life-card-label">Notes</span>
              <textarea
                value={entryDraft.note}
                onChange={(event) => setEntryDraft((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                placeholder="Anything relevant about body changes, bloating, pump, or consistency..."
                className="life-textarea"
              />
            </label>
            <button type="submit" className="life-primary-button w-full justify-center">
              Save body check-in
            </button>
          </form>
        </section>

        <section className="life-panel">
          <p className="life-card-label">Latest snapshot</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            See what changed from the previous check-in.
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              {
                title: 'Weight',
                value: latest ? formatMeasurement(latest.weightValue, latest.weightUnit) : 'Not set',
                help: latest ? changeSummary(latest.weightValue, previous?.weightValue, latest.weightUnit) : 'Add a check-in to start tracking.',
                icon: Scale,
              },
              {
                title: 'BMI',
                value: latestBmi ? latestBmi.toFixed(1) : 'Not set',
                help: latest?.heightValue || profile.heightCm ? 'Calculated automatically from your saved height and weight.' : 'Add height once to unlock BMI.',
                icon: Activity,
              },
              {
                title: 'Waist',
                value: latest ? formatMeasurement(latest.waistValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.waistValue, previous?.waistValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: latest && previous && numeric(latest.waistValue) < numeric(previous?.waistValue) ? TrendingDown : TrendingUp,
              },
              {
                title: 'Bicep',
                value: latest ? formatMeasurement(latest.bicepValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.bicepValue, previous?.bicepValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: latest && previous && numeric(latest.bicepValue) >= numeric(previous?.bicepValue) ? TrendingUp : Activity,
              },
              {
                title: 'Above navel',
                value: latest ? formatMeasurement(latest.aboveNavelValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.aboveNavelValue, previous?.aboveNavelValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: Activity,
              },
              {
                title: 'Chest',
                value: latest ? formatMeasurement(latest.chestValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.chestValue, previous?.chestValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: Activity,
              },
              {
                title: 'Hip',
                value: latest ? formatMeasurement(latest.hipValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.hipValue, previous?.hipValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: Activity,
              },
              {
                title: 'Thigh',
                value: latest ? formatMeasurement(latest.thighValue, latest.bodyMeasurementUnit) : 'Not set',
                help: latest ? changeSummary(latest.thighValue, previous?.thighValue, latest.bodyMeasurementUnit || 'cm') : 'Add a check-in to start tracking.',
                icon: Activity,
              },
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
            <p className="life-card-label">Measurement trends</p>
            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Weight, waist, above navel, and bicep over time
            </h3>
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
                <Line yAxisId="weight" type="monotone" dataKey="weight" stroke="#0f766e" strokeWidth={3} dot={{ r: 3 }} />
                <Line yAxisId="body" type="monotone" dataKey="waist" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} />
                <Line yAxisId="body" type="monotone" dataKey="aboveNavel" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
                <Bar yAxisId="body" dataKey="bicep" fill="rgba(168, 85, 247, 0.24)" radius={[10, 10, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="life-panel">
          <p className="life-card-label">Insights</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">What to work on next</h3>
          <div className="mt-6 grid gap-4">
            {insights.length === 0 ? (
              <div className="life-soft-card">
                <p className="text-sm leading-6 text-slate-500 dark:text-white/55">
                  Add a few body check-ins to get more useful pattern recognition here.
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
        </section>
      </div>

      <section className="life-panel">
        <p className="life-card-label">Recent entries</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">Your latest body measurements</h3>
        <div className="mt-6 overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th>Height</th>
                <th>BMI</th>
                <th>Waist</th>
                <th>Above navel</th>
                <th>Bicep</th>
                <th>Chest</th>
                <th>Hip</th>
                <th>Thigh</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedEntries.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center text-slate-500 dark:text-white/50">No body check-ins yet.</td>
                </tr>
              ) : (
                sortedEntries.map((entry) => {
                  const bmi = computeBmi(entry.weightValue, entry.weightUnit, entry.heightValue || profile.heightCm, entry.heightUnit || 'cm');
                  return (
                    <tr key={entry.id}>
                      <td>{entry.date ? format(new Date(entry.date), 'dd MMM yyyy') : 'No date'}</td>
                      <td>{entry.weightValue ? `${entry.weightValue} ${entry.weightUnit}` : '—'}</td>
                      <td>{entry.heightValue ? `${entry.heightValue} ${entry.heightUnit}` : (profile.heightCm ? `${profile.heightCm} cm` : '—')}</td>
                      <td>{bmi ? bmi.toFixed(1) : '—'}</td>
                      <td>{entry.waistValue ? `${entry.waistValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
                      <td>{entry.aboveNavelValue ? `${entry.aboveNavelValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
                      <td>{entry.bicepValue ? `${entry.bicepValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
                      <td>{entry.chestValue ? `${entry.chestValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
                      <td>{entry.hipValue ? `${entry.hipValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
                      <td>{entry.thighValue ? `${entry.thighValue} ${entry.bodyMeasurementUnit}` : '—'}</td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default FitnessView;
