function addDays(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function formatAppliedDate(date) {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

export function generateFollowUpScripts({ jobTitle, companyName, userName, appliedDate }) {
  const safeUserName = userName || 'there';
  const safeCompanyName = companyName || 'your team';
  const formattedAppliedDate = formatAppliedDate(appliedDate);
  const day5Date = addDays(appliedDate, 5);
  const day10Date = addDays(appliedDate, 10);
  const day14Date = addDays(appliedDate, 14);

  return [
    {
      day: 5,
      sendOn: day5Date.toISOString(),
      subject: `Following up - ${jobTitle} application`,
      body: `Hi,\n\nI wanted to follow up on my application for the ${jobTitle} role at ${safeCompanyName} submitted on ${formattedAppliedDate}. I remain very interested in this opportunity and would love to learn about the next steps.\n\nPlease let me know if you need any additional information from my side.\n\nThank you for your time.\n\nBest regards,\n${safeUserName}`
    },
    {
      day: 10,
      sendOn: day10Date.toISOString(),
      subject: `Re: ${jobTitle} application - quick check-in`,
      body: `Hi,\n\nI'm reaching out again regarding the ${jobTitle} position at ${safeCompanyName}. I understand hiring takes time and I appreciate your efforts.\n\nI want to reiterate my strong interest in this role and the work ${safeCompanyName} is doing. If there's a good time to connect briefly, I would welcome that.\n\nThank you.\n\n${safeUserName}`
    },
    {
      day: 14,
      sendOn: day14Date.toISOString(),
      subject: `Final follow-up - ${jobTitle} at ${safeCompanyName}`,
      body: `Hi,\n\nThis is my final follow-up regarding the ${jobTitle} role. I understand if the position has been filled or circumstances have changed.\n\nIf there are future opportunities that match my profile, I would genuinely welcome being considered. I wish you and the team at ${safeCompanyName} all the best.\n\nThank you for your time.\n\n${safeUserName}`
    }
  ];
}
