'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_RE = /^[+\d][\d\s\-()]{5,24}$/;

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
    this.details = details;
  }
}

function parsePositiveInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`);
  }
  return num;
}

function parseNonNegativeInt(value, fieldName) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0 || num > 10000) {
    throw new ValidationError(`${fieldName} must be an integer between 0 and 10000.`);
  }
  return num;
}

function cleanString(value, fieldName, { min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new ValidationError(`${fieldName} is required.`);
    return null;
  }
  const str = String(value).trim();
  if (str.length < min || str.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters.`);
  }
  return str;
}

function parseIsoDate(value, fieldName, { required = true } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new ValidationError(`${fieldName} is required (YYYY-MM-DD).`);
    return null;
  }
  const str = String(value).trim();
  if (!ISO_DATE_RE.test(str)) {
    throw new ValidationError(`${fieldName} must be a valid YYYY-MM-DD date.`);
  }
  const parsed = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== str) {
    throw new ValidationError(`${fieldName} is not a real calendar date.`);
  }
  return str;
}

function validateBookPayload(body) {
  return {
    title: cleanString(body.title, 'title', { min: 1, max: 200 }),
    author: cleanString(body.author, 'author', { min: 1, max: 150 }),
    category: cleanString(body.category || 'General', 'category', { min: 1, max: 100 }),
    available_copies: parseNonNegativeInt(
      body.available_copies !== undefined ? body.available_copies : 1,
      'available_copies'
    )
  };
}

function validateMemberPayload(body) {
  const full_name = cleanString(body.full_name, 'full_name', { min: 2, max: 150 });
  const email = cleanString(body.email, 'email', { min: 5, max: 180 }).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError('email must be a valid email address.');
  }
  const phone = cleanString(body.phone, 'phone', { min: 6, max: 30, required: false });
  if (phone && !PHONE_RE.test(phone)) {
    throw new ValidationError('phone contains invalid characters.');
  }
  const join_date =
    parseIsoDate(body.join_date, 'join_date', { required: false }) ||
    new Date().toISOString().slice(0, 10);

  return { full_name, email, phone, join_date };
}

function validateLoanPayload(body) {
  const book_id = parsePositiveInt(body.book_id, 'book_id');
  const member_id = parsePositiveInt(body.member_id, 'member_id');
  const borrow_date =
    parseIsoDate(body.borrow_date, 'borrow_date', { required: false }) ||
    new Date().toISOString().slice(0, 10);
  const due_date = parseIsoDate(body.due_date, 'due_date', { required: true });

  if (due_date < borrow_date) {
    throw new ValidationError('due_date cannot be earlier than borrow_date.');
  }
  return { book_id, member_id, borrow_date, due_date };
}

function whitelistSort(value, allowedMap, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  return allowedMap[value.toLowerCase()] || fallback;
}

module.exports = {
  ValidationError,
  parsePositiveInt,
  parseIsoDate,
  validateBookPayload,
  validateMemberPayload,
  validateLoanPayload,
  whitelistSort
};
