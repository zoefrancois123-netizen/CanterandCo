const SUPABASE_URL = "https://notlmqtzvsbokjuhtgkh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vdGxtcXR6dnNib2tqdWh0Z2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzODA2NDgsImV4cCI6MjA5NTk1NjY0OH0.fdDpm42L_SXInt6oZDOD9rTQrUO8Qw6DV3pEzN2O-sk";
const bookingEmail = "chloe.f0778@gmail.com";
const etsyShopUrl = "https://www.etsy.com/shop/HouseofCastlemaine";

const publicBookingClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const servicesByType = {
  horse: [
    { id: "beginner-lesson", label: "Flat work Lesson - R300" },
    { id: "jumping-lesson", label: "Jumping Lesson - R300" },
    { id: "basics-ground-work", label: "Basics Ground Work Lesson - R200" },
    { id: "exercise-ride", label: "Schooling Session - R200" },
    { id: "show-prep-mane", label: "Horse Show Prep - Mane Only - R250" },
    { id: "show-prep-mane-tail", label: "Horse Show Prep - Mane & Tail - R300" },
    { id: "show-prep-tail", label: "Horse Show Prep - Tail Only - R50" },
    { id: "show-day-support", label: "Show Help - R400" },
  ],
  "house-pet": [
    { id: "house-sitting", label: "House sitting - R400" },
    { id: "pet-sitting", label: "Pet Sitting - R50" },
  ],
  child: [
    { id: "baby-sitting", label: "Baby sitting - R300" },
    { id: "tutoring", label: "Tutoring" },
  ],
};

const typeLabels = {
  horse: "Equestrian services",
  "house-pet": "House and pet sitting services",
  child: "Baby sitting and tutoring",
};

const dynamicFields = {
  horse: [
    {
      label: "Horse / rider details",
      name: "detailsOne",
      placeholder: "Horse name, rider age, own horse or school horse",
    },
    {
      label: "Yard or stable name",
      name: "detailsTwo",
      placeholder: "Private yard name or Glen Graze",
    },
  ],
  "house-pet": [
    {
      label: "Pet / animal details",
      name: "detailsOne",
      placeholder: "Pet names, animal type, feeding routine",
    },
    {
      label: "Home access notes",
      name: "detailsTwo",
      placeholder: "Keys, alarm, gate, plants, parking",
    },
  ],
  child: [
    {
      label: "Child details",
      name: "detailsOne",
      placeholder: "Child name, age, routine, allergies",
    },
    {
      label: "Tutoring subject or care notes",
      name: "detailsTwo",
      placeholder: "Maths, reading, homework, bedtime routine",
    },
  ],
};

function renderServiceForm() {
  const serviceType = document.getElementById("service-type").value;
  const serviceSelect = document.getElementById("service-select");
  const fields = document.getElementById("dynamic-fields");

  serviceSelect.innerHTML = servicesByType[serviceType]
    .map((service) => `<option value="${service.id}">${service.label}</option>`)
    .join("");

  fields.innerHTML = dynamicFields[serviceType]
    .map((field) => `
      <label>
        ${field.label}
        <input name="${field.name}" placeholder="${field.placeholder}" />
      </label>
    `)
    .join("");

  document.querySelectorAll(".booking-choice").forEach((button) => {
    button.classList.toggle("active", button.dataset.serviceType === serviceType);
  });
}

function formValue(form, name) {
  return new FormData(form).get(name) || "";
}

function selectedServiceLabel(form) {
  const serviceId = formValue(form, "service");
  const serviceType = formValue(form, "serviceType");
  return servicesByType[serviceType].find((service) => service.id === serviceId)?.label || serviceId;
}

function bookingPayload(form) {
  const serviceType = formValue(form, "serviceType");
  return {
    source: "website",
    clientName: formValue(form, "name"),
    phone: formValue(form, "phone"),
    email: formValue(form, "email"),
    serviceType,
    serviceTypeLabel: typeLabels[serviceType],
    serviceId: formValue(form, "service"),
    serviceLabel: selectedServiceLabel(form),
    date: formValue(form, "date"),
    time: formValue(form, "time") || "09:00",
    location: formValue(form, "location"),
    detailsOne: formValue(form, "detailsOne"),
    detailsTwo: formValue(form, "detailsTwo"),
    notes: formValue(form, "notes"),
    submittedAt: new Date().toISOString(),
  };
}

function buildBookingEmail(payload) {
  const parts = [
    "New Canter & Co booking request",
    "",
    `Name: ${payload.clientName}`,
    `Phone: ${payload.phone}`,
    `Email: ${payload.email}`,
    `Service type: ${payload.serviceTypeLabel}`,
    `Service: ${payload.serviceLabel}`,
    `Preferred date: ${payload.date || "Not specified"}`,
    `Preferred time: ${payload.time || "Not specified"}`,
    `Location: ${payload.location}`,
    `Details: ${payload.detailsOne || "Not specified"}`,
    `Extra details: ${payload.detailsTwo || "Not specified"}`,
    "",
    "Notes:",
    payload.notes || "No notes added.",
  ];

  return {
    subject: `Canter & Co booking request - ${payload.serviceLabel}`,
    body: parts.join("\n"),
  };
}

async function submitBookingRequest(form) {
  const submitButton = document.getElementById("submit-booking-request");
  const note = document.getElementById("form-note");
  const payload = bookingPayload(form);

  submitButton.disabled = true;
  note.textContent = "Sending your request to Chloe...";

  if (!publicBookingClient) {
    const { subject, body } = buildBookingEmail(payload);
    note.innerHTML = `The planner connection did not load. Please email Chloe directly at <a href="mailto:${bookingEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">${bookingEmail}</a>.`;
    submitButton.disabled = false;
    return;
  }

  const { error } = await publicBookingClient.from("booking_requests").insert({
    status: "pending",
    request: payload,
  });

  if (!error) {
    form.reset();
    document.getElementById("service-type").value = payload.serviceType;
    renderServiceForm();
    note.textContent = "Thank you. Your request has been sent to Chloe for approval before it is added to the diary.";
    submitButton.disabled = false;
    return;
  }

  note.textContent = `The planner connection failed: ${error.message}. Please contact Chloe directly at ${bookingEmail}.`;
  submitButton.disabled = false;
}

document.querySelectorAll(".booking-choice").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById("service-type").value = button.dataset.serviceType;
    renderServiceForm();
  });
});

document.getElementById("public-booking-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitBookingRequest(event.currentTarget);
});

document.querySelectorAll(".etsy-link").forEach((link) => {
  link.href = etsyShopUrl;
});

renderServiceForm();
