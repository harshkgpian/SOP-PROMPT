// services/promptService.js
function buildSOPPrompt(metadata, resumeContent) {
  const { course, university, country, courseInfo } = metadata;
  let resumeSection = resumeContent
    ? `
--- My Resume Information ---
${resumeContent}
-----------------------------

Now, using the above course details and my resume information, please generate a Statement of Purpose. Follow the structure below:
`
    : `
Please take all the required details from the attached profile. It should be able to properly justify my course selection and align it with my past. Structure the SOP as per below:
`;

  return `
I am applying to the Master's in ${course} at ${university} in ${country}.

${resumeSection}
1st Paragraph – Introduction: Write about how the ${course} industry is growing and from where I gained initial interest. Complete the paragraph by setting the context of why I want to apply for this course at this university.

2nd Paragraph – Academic Journey: Explain my academic journey starting from the 10th. Go in chronological order and explain the transitions. In case of work experience, also connect that with my past and explain why I think this is the right time to resume my academic journey. End the paragraph with “hence I decided to pursue further education.”

3rd Paragraph – Why this Course: Explain why this course is good for me. Align it with my past education and experience.

4th Paragraph – Why this University: Explain why ${university}. Align it with the course that I have selected.

5th Paragraph – Why this Country: Explain why ${country}. Justify it in the context of this course.

6th Paragraph – Future Plans: Explain my plans after the completion of this course.

7th Paragraph – Conclusion: Wrap up the SOP with a convincing statement and gratitude.

Here is the course information:\n${courseInfo}
`;
}

module.exports = { buildSOPPrompt };