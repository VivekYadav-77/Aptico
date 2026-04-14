import { useEffect, useMemo, useState } from 'react';
import { fetchProfileSettings, saveProfileSettings } from '../api/profileApi.js';

const STORAGE_KEY = 'aptico-profile-settings';
const UPDATE_EVENT = 'aptico-profile-settings-updated';

function splitName(name) {
  const value = `${name || ''}`.trim();

  if (!value) {
    return { firstName: 'Aptico', lastName: 'User' };
  }

  const [firstName, ...rest] = value.split(/\s+/);

  return {
    firstName,
    lastName: rest.join(' ') || 'User'
  };
}

function parseList(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  return `${value || ''}`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function createDefaults(auth, analysis) {
  const user = auth?.user || {};
  const nameParts = splitName(user.name);
  const matchedSkills = Array.isArray(analysis?.matchedSkills) ? analysis.matchedSkills : [];

  return {
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    headline: analysis?.jobTitle || user.role || 'Aspiring product-focused professional',
    email: user.email || 'you@example.com',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    portfolio: '',
    bio: 'Building a strong, discovery-friendly profile that turns project work and achievements into clear career momentum.',
    currentStatus: 'job-seeker',
    currentTitle: '',
    currentCompany: '',
    yearsExperience: '',
    industry: '',
    targetRole: analysis?.companyName || 'Product-minded software engineer',
    employmentType: 'full-time',
    availability: 'Actively exploring new opportunities',
    openToWork: true,
    preferredWorkModes: ['remote', 'hybrid'],
    topSkills: matchedSkills.length ? matchedSkills : ['React', 'Node.js', 'Problem solving'],
    tools: ['Git', 'Figma', 'Notion'],
    languages: ['English'],
    achievements: [
      'Led meaningful projects with measurable outcomes',
      'Built a profile that is ready for recruiter and collaborator discovery'
    ],
    school: '',
    degree: '',
    fieldOfStudy: '',
    graduationYear: '',
    certifications: '',
    learningFocus: '',
    publicProfile: true,
    allowRecruiterMessages: true,
    showEmail: true,
    showPhone: false,
    profileStrengthNotes:
      'Complete identity, work intent, education, achievements, and skills to make this profile platform-ready for future recruiter discovery.',
    notificationAnalysisUpdates: true,
    notificationOpportunityNudges: true,
    notificationSecurityAlerts: true,
    // Section visibility (everyone / connections / only_me)
    sectionVisibility: {
      about: 'everyone',
      featured: 'everyone',
      activity: 'everyone',
      experience: 'everyone',
      education: 'everyone',
      licenses: 'everyone',
      skills: 'everyone',
      honorsAwards: 'everyone'
    },
    // Multi-entry sections
    featured: [],
    experiences: [],
    educationEntries: [],
    licenses: [],
    honorsAwards: []
  };
}

function parseArrayField(value, fallback) {
  if (Array.isArray(value) && value.length) return value;
  if (Array.isArray(fallback)) return fallback;
  return [];
}

function mergeWithDefaults(defaults, incoming) {
  const nextValue = incoming && typeof incoming === 'object' ? incoming : {};

  return {
    ...defaults,
    ...nextValue,
    preferredWorkModes: parseList(nextValue.preferredWorkModes || defaults.preferredWorkModes),
    topSkills: parseList(nextValue.topSkills || defaults.topSkills),
    tools: parseList(nextValue.tools || defaults.tools),
    languages: parseList(nextValue.languages || defaults.languages),
    achievements: parseList(nextValue.achievements || defaults.achievements),
    sectionVisibility: { ...defaults.sectionVisibility, ...(nextValue.sectionVisibility || {}) },
    featured: parseArrayField(nextValue.featured, defaults.featured),
    experiences: parseArrayField(nextValue.experiences, defaults.experiences),
    educationEntries: parseArrayField(nextValue.educationEntries, defaults.educationEntries),
    licenses: parseArrayField(nextValue.licenses, defaults.licenses),
    honorsAwards: parseArrayField(nextValue.honorsAwards, defaults.honorsAwards)
  };
}

function readStoredProfile(defaults) {
  if (typeof window === 'undefined') {
    return defaults;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return defaults;
    }

    return mergeWithDefaults(defaults, JSON.parse(rawValue));
  } catch (error) {
    return defaults;
  }
}

function persistProfile(profile) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function useProfileSettings(auth, analysis) {
  const defaults = useMemo(() => createDefaults(auth, analysis), [auth, analysis]);
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const [profile, setProfile] = useState(() => readStoredProfile(defaults));
  const [isLoadingProfile, setIsLoadingProfile] = useState(isAuthenticated);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setProfile((current) => mergeWithDefaults(defaults, current));
  }, [defaults]);

  useEffect(() => {
    let isActive = true;

    async function loadRemoteProfile() {
      if (!isAuthenticated) {
        setProfile(readStoredProfile(defaults));
        setIsLoadingProfile(false);
        setProfileError('');
        return;
      }

      setIsLoadingProfile(true);
      setProfileError('');

      try {
        const remoteProfile = await fetchProfileSettings();
        if (!isActive) {
          return;
        }

        const mergedProfile = mergeWithDefaults(defaults, remoteProfile);
        persistProfile(mergedProfile);
        setProfile(mergedProfile);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProfile(readStoredProfile(defaults));
        setProfileError(error.response?.data?.error || 'Could not load your saved profile settings.');
      } finally {
        if (isActive) {
          setIsLoadingProfile(false);
        }
      }
    }

    void loadRemoteProfile();

    return () => {
      isActive = false;
    };
  }, [defaults, isAuthenticated]);

  useEffect(() => {
    function handleProfileUpdate() {
      setProfile(readStoredProfile(defaults));
    }

    window.addEventListener(UPDATE_EVENT, handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);

    return () => {
      window.removeEventListener(UPDATE_EVENT, handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [defaults]);

  async function saveProfile(nextProfile) {
    const mergedProfile = mergeWithDefaults(defaults, nextProfile);

    if (isAuthenticated) {
      const savedProfile = await saveProfileSettings(mergedProfile);
      persistProfile(savedProfile);
      setProfile(savedProfile);
      return savedProfile;
    }

    persistProfile(mergedProfile);
    setProfile(mergedProfile);
    return mergedProfile;
  }

  function saveProfileLocally(nextProfile) {
    persistProfile(nextProfile);
    setProfile(nextProfile);
  }

  async function resetProfile() {
    if (isAuthenticated) {
      const savedProfile = await saveProfileSettings(defaults);
      persistProfile(savedProfile);
      setProfile(savedProfile);
      return savedProfile;
    }

    persistProfile(defaults);
    setProfile(defaults);
    return defaults;
  }

  return {
    profile,
    setProfile,
    saveProfile,
    saveProfileLocally,
    resetProfile,
    isLoadingProfile,
    profileError
  };
}

export const profileStatusOptions = [
  { value: 'student', label: 'Student' },
  { value: 'employee', label: 'Employee' },
  { value: 'job-seeker', label: 'Job seeker' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'founder', label: 'Founder' }
];

export const workModeOptions = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' }
];

export const employmentTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' }
];
