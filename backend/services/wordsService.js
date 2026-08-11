const { ToWords } = require("to-words");
const { round2 } = require("../utils/moneyHelper");

// Indian numbering system (lakh / crore) with INR currency wording, which produces
// the exact phrasing used on the printed documents:
// "Fourteen Thousand One Hundred Sixty Rupees Only"
const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
  },
});

const amountToWords = (amount) => {
  const value = round2(amount);
  try {
    return toWords.convert(value);
  } catch (error) {
    console.error("Amount To Words Error:", error.message);
    return "";
  }
};

module.exports = { amountToWords };
