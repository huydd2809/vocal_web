// Địa chỉ Backend của chúng ta
const API_URL = "http://127.0.0.1:5000/api/words";

// ==========================================
// 1. TÍNH NĂNG THÊM TỪ VỰNG
// ==========================================
document.getElementById("addBtn").addEventListener("click", async () => {
  const english = document.getElementById("engWord").value.trim();
  const vietnamese = document.getElementById("vieMeaning").value.trim();
  const partOfSpeech = document.getElementById("partOfSpeech").value.trim();
  const pronunciation = document.getElementById("pronunciation").value.trim();
  const unit = document.getElementById("unitSelect").value;
  // THÊM ĐOẠN NÀY ĐỂ LẤY DỮ LIỆU WORD FAMILY
  const word_family = {
    n: document.getElementById("wfNoun").value.trim(),
    v: document.getElementById("wfVerb").value.trim(),
    adj: document.getElementById("wfAdj").value.trim(),
    adv: document.getElementById("wfAdv").value.trim(),
  };

  if (!english || !vietnamese || !partOfSpeech || !pronunciation) {
    alert("Vui lòng nhập đầy đủ thông tin!");
    return;
  }

  const newWord = {
    english,
    vietnamese,
    type: partOfSpeech,
    pronunciation,
    unit,
    word_family,
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWord),
    });
    const data = await response.json();

    // Hiển thị thông báo thành công
    const msgEl = document.getElementById("addMessage");
    msgEl.innerText = data.message;
    msgEl.style.color = "green";

    // Xóa trắng các ô nhập liệu sau khi thêm
    document.getElementById("engWord").value = "";
    document.getElementById("vieMeaning").value = "";
    document.getElementById("partOfSpeech").value = "";
    document.getElementById("pronunciation").value = "";

    // Tải lại danh sách Flashcard để cập nhật từ mới
    loadFlashcards();

    // Ẩn thông báo sau 3 giây
    setTimeout(() => (msgEl.innerText = ""), 3000);
  } catch (error) {
    alert("Có lỗi kết nối với máy chủ!");
    console.error(error);
  }
});

// ==========================================
// 2. TÍNH NĂNG FLASHCARD
// ==========================================
let flashcards = [];
let currentCardIndex = 0;

// Lấy danh sách từ vựng từ Backend
async function loadFlashcards() {
  try {
    const response = await fetch(API_URL);
    flashcards = await response.json();
    currentCardIndex = 0;
    displayFlashcard();
  } catch (error) {
    console.error("Lỗi khi tải flashcard:", error);
  }
}

// Hiển thị nội dung lên thẻ Flashcard
function displayFlashcard() {
  if (flashcards.length === 0) {
    document.getElementById("fcEngWord").innerText = "Chưa có từ vựng";
    document.getElementById("fcVieMeaning").innerText =
      "Hãy thêm từ mới ở phía trên";
    document.getElementById("fcPartOfSpeech").innerText = "";
    document.getElementById("fcPronunciation").innerText = "";
    return;
  }

  const card = flashcards[currentCardIndex];
  document.getElementById("fcEngWord").innerText = card.english;
  document.getElementById("fcVieMeaning").innerText = card.vietnamese;
  document.getElementById("fcPartOfSpeech").innerText = card.type;
  document.getElementById("fcPronunciation").innerText = card.pronunciation;

  // Hiển thị cấp độ hiện tại của từ vào ô chọn thủ công
  document.getElementById("manualLevel").value = card.level;

  // Đảm bảo thẻ luôn ở mặt trước (Tiếng Anh) khi chuyển từ
  document.getElementById("flashcard").classList.remove("flipped");
}

// Hiệu ứng lật thẻ
document.getElementById("flashcard").addEventListener("click", function () {
  if (flashcards.length > 0) {
    this.classList.toggle("flipped");
  }
});

// Nút chuyển thẻ tiếp theo/trước đó
document.getElementById("nextCardBtn").addEventListener("click", () => {
  if (flashcards.length > 0) {
    currentCardIndex = (currentCardIndex + 1) % flashcards.length;
    displayFlashcard();
  }
});

document.getElementById("prevCardBtn").addEventListener("click", () => {
  if (flashcards.length > 0) {
    currentCardIndex =
      (currentCardIndex - 1 + flashcards.length) % flashcards.length;
    displayFlashcard();
  }
});

// Nút cập nhật cấp độ thủ công
document
  .getElementById("updateLevelBtn")
  .addEventListener("click", async () => {
    if (flashcards.length === 0) return;
    const newLevel = document.getElementById("manualLevel").value;
    const cardId = flashcards[currentCardIndex].id;

    try {
      await fetch(`${API_URL}/${cardId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: parseInt(newLevel) }),
      });
      alert("Đã cập nhật cấp độ thành công!");
      flashcards[currentCardIndex].level = parseInt(newLevel);
    } catch (error) {
      console.error(error);
    }
  });

// ==========================================
// 3. TÍNH NĂNG KIỂM TRA TỪ VỰNG (CÓ ĐẾM NGƯỢC & PHẠT HẠ CẤP)
// ==========================================
let quizWords = [];
let currentQuizIndex = 0;
let quizTimer = null; // Biến lưu trữ bộ đếm thời gian liên tục cục bộ
let timeLeft = 10; // Mỗi câu có 10 giây

// Nút Bắt đầu kiểm tra
document.getElementById("startQuizBtn").addEventListener("click", async () => {
  const unit = document.getElementById("quizUnit").value;
  const level = document.getElementById("quizLevelFilter").value;

  // Xóa bộ đếm cũ nếu có lượt thi trước đang chạy dở
  clearInterval(quizTimer);

  try {
    const response = await fetch(`${API_URL}?unit=${unit}&level=${level}`);
    const words = await response.json();

    if (words.length === 0) {
      alert("Không có từ vựng nào phù hợp với bộ lọc này!");
      document.getElementById("quizArea").style.display = "none";
      document.getElementById("quizSummaryArea").style.display = "none";
      return;
    }

    // Khởi tạo lượt thi
    quizWords = words.map((w) => ({
      ...w,
      userAnswer: "",
      isCorrect: false,
    }));

    quizWords.sort(() => Math.random() - 0.5); //từ xuất hiện random

    currentQuizIndex = 0;

    document.getElementById("quizArea").style.display = "block";
    document.getElementById("quizSummaryArea").style.display = "none";

    displayQuizWord();
  } catch (error) {
    console.error(error);
  }
});

// Hàm hiển thị nội dung từ và khởi động đồng hồ đếm ngược
// Hàm hiển thị nội dung từ và khởi động đồng hồ đếm ngược
function displayQuizWord() {
  if (quizWords.length === 0) return;

  const currentWord = quizWords[currentQuizIndex];

  document.getElementById("quizProgress").innerText =
    `Từ thứ ${currentQuizIndex + 1} / ${quizWords.length}`;
  document.getElementById("quizCurrentLevel").innerText = currentWord.level;
  document.getElementById("quizQuestion").innerText = currentWord.vietnamese;
  document.getElementById("quizHint").innerText = `(${currentWord.type})`;

  // ĐOẠN XỬ LÝ LỖI BỘ NHỚ ĐỆM BÀN PHÍM (IME BUG)
  const answerInput = document.getElementById("quizAnswer");

  answerInput.blur(); // Bỏ chọn ô nhập trong tích tắc để cắt đứt bộ nhớ đệm Unikey/bàn phím
  answerInput.value = currentWord.userAnswer; // Đổ lại dữ liệu (chữ đang gõ dở hoặc để trống)

  // Đợi 10 mili-giây để trình duyệt hoàn tất việc reset bàn phím, sau đó mới focus lại
  setTimeout(() => {
    answerInput.focus();
  }, 10);

  // Khởi tạo lại thời gian cho câu hỏi mới
  startCountdown();
}

// Hàm xử lý đếm ngược 10 giây
function startCountdown() {
  // Xóa bộ đếm của câu trước đó để không bị chạy lồng nhau
  clearInterval(quizTimer);

  timeLeft = 15;
  document.getElementById("countdownClock").innerText = timeLeft;

  quizTimer = setInterval(() => {
    timeLeft--;
    document.getElementById("countdownClock").innerText = timeLeft;

    if (timeLeft <= 0) {
      clearInterval(quizTimer);
      // Hết giờ: tự động lưu kết quả hiện tại và chuyển sang từ tiếp theo
      handleNextWordAction();
    }
  }, 1000); // Chạy lại sau mỗi 1000ms (1 giây)
}

// Lưu tạm đáp án người dùng đang gõ
function saveCurrentInputState() {
  if (quizWords.length > 0) {
    quizWords[currentQuizIndex].userAnswer = document
      .getElementById("quizAnswer")
      .value.trim();
  }
}

// Hàm điều hướng chung khi bấm "Từ tiếp theo" hoặc khi HẾT GIỜ
function handleNextWordAction() {
  saveCurrentInputState();

  // Nếu chưa phải từ cuối cùng, nhảy sang từ tiếp theo
  if (currentQuizIndex < quizWords.length - 1) {
    currentQuizIndex++;
    displayQuizWord();
  } else {
    // Nếu đã ở từ cuối cùng mà hết giờ hoặc bấm Tiếp theo, tự động kết thúc bài thi luôn
    clearInterval(quizTimer);
    finishQuizAndCalculate();
  }
}

// Nút Kết thúc bài thi chủ động
document.getElementById("finishQuizBtn").addEventListener("click", () => {
  if (quizWords.length === 0) return;
  clearInterval(quizTimer); // Dừng đồng hồ ngay lập tức
  saveCurrentInputState();
  finishQuizAndCalculate();
});

// Hàm xử lý Chấm điểm + Tăng cấp / Tụt cấp một lượt khi Kết thúc bài thi
async function finishQuizAndCalculate() {
  let correctCount = 0;
  let isAnyLevelChanged = false;

  // Sử dụng vòng lặp để xử lý tuần tự từng từ
  for (let word of quizWords) {
    const answerLower = (word.userAnswer || "").toLowerCase();
    const correctLower = word.english.toLowerCase();

    if (answerLower === correctLower) {
      word.isCorrect = true;
      correctCount++;

      // ĐÚNG: Nếu level < 4 thì tự động tăng lên 1 cấp
      if (word.level < 4) {
        const newLevel = word.level + 1;
        try {
          await fetch(`${API_URL}/${word.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: newLevel }),
          });
          word.level = newLevel; // Cập nhật tạm để hiển thị trên bảng tổng kết
          isAnyLevelChanged = true;
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      word.isCorrect = false;

      // SAI hoặc BỎ QUA: Nếu từ đang ở mức độ 4, phạt tụt xuống mức độ 3 (MỚI)
      if (word.level === 4) {
        const newLevel = 3;
        try {
          await fetch(`${API_URL}/${word.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level: newLevel }),
          });
          word.level = newLevel; // Cập nhật tạm để hiển thị trên bảng tổng kết
          isAnyLevelChanged = true;
        } catch (e) {
          console.error(e);
        }
      }
    }
  }

  // Nếu có bất kỳ sự thay đổi level nào (tăng hoặc tụt), cập nhật lại các bảng dữ liệu khác
  if (isAnyLevelChanged) {
    loadFlashcards();
    if (typeof loadVocabList === "function") loadVocabList();
  }

  // Hiển thị điểm số tổng kết
  document.getElementById("summaryScore").innerText =
    `Bạn đã trả lời đúng: ${correctCount} / ${quizWords.length} từ`;

  // Tạo bảng chi tiết so sánh đáp án
  const summaryTableBody = document.getElementById("summaryTableBody");
  summaryTableBody.innerHTML = "";

  quizWords.forEach((word) => {
    const row = document.createElement("tr");
    const statusHTML = word.isCorrect
      ? '<span style="color:#2ecc71; font-weight:bold;">Đúng 🟢</span>'
      : '<span style="color:#e74c3c; font-weight:bold;">Sai / Hết giờ 🔴</span>';

    row.innerHTML = `
            <td style="color: #c0392b; font-weight: bold;">${word.vietnamese}</td>
            <td style="color: #2c3e50; font-weight: bold;">${word.english} <span style="color:#8e44ad;">(${word.pronunciation})</span></td>
            <td style="font-style: italic; color:#555;">${word.userAnswer || '<b style="color:#aaa;">Bỏ qua / Hết giờ</b>'}</td>
            <td>${statusHTML}</td>
        `;
    summaryTableBody.appendChild(row);
  });

  // Chuyển màn hình giao diện
  document.getElementById("quizArea").style.display = "none";
  document.getElementById("quizSummaryArea").style.display = "block";
}

// Nút Từ tiếp theo (Chủ động bỏ qua hoặc chuyển câu khi viết xong)
document.getElementById("nextQuizBtn").addEventListener("click", () => {
  if (quizWords.length > 0) {
    handleNextWordAction();
  }
});

// ==========================================
// TÍNH NĂNG MỚI: BẤM ENTER ĐỂ CHUYỂN TỪ
// ==========================================
document
  .getElementById("quizAnswer")
  .addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (quizWords.length > 0) {
        handleNextWordAction();
      }
    }
  });

// ==========================================
// 4. TÍNH NĂNG XEM DANH SÁCH TỪ VỰNG (MỚI)
// ==========================================
document.getElementById("viewListBtn").addEventListener("click", loadVocabList);

async function loadVocabList() {
  const unit = document.getElementById("listUnit").value;
  const level = document.getElementById("listLevel").value;

  try {
    // Gọi API lên Backend với các tham số bộ lọc tương ứng
    const response = await fetch(`${API_URL}?unit=${unit}&level=${level}`);
    const words = await response.json();

    const tableBody = document.getElementById("vocabTableBody");
    tableBody.innerHTML = ""; // Xóa sạch dữ liệu cũ trong bảng trước khi nạp mới

    if (words.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#95a5a6; font-style:italic;">Không có từ vựng nào phù hợp với bộ lọc này!</td></tr>`;
      return;
    }

    // Duyệt qua từng từ nhận được từ Backend và tạo các dòng <tr> tương ứng
    words.forEach((word) => {
      const row = document.createElement("tr");

      // Đổi màu badge tùy theo mức độ thuộc
      let badgeColor = "#e74c3c"; // Cấp 1: Đỏ
      if (word.level === 2) badgeColor = "#f39c12"; // Cấp 2: Cam
      if (word.level === 3) badgeColor = "#3498db"; // Cấp 3: Xanh dương
      if (word.level === 4) badgeColor = "#2ecc71"; // Cấp 4: Xanh lá

      row.innerHTML = `
                <td style="font-weight: bold; color: #2c3e50;">${word.english}</td>
                <td style="color: #8e44ad; font-weight: bold;">${word.pronunciation}</td>
                <td style="font-style: italic; color: #7f8c8d;">${word.type}</td>
                <td style="color: #c0392b;">${word.vietnamese}</td>
                <td style="text-transform: uppercase; font-weight: bold;">${word.unit}</td>
                <td><span class="table-level-badge" style="background-color: ${badgeColor};">Cấp ${word.level}</span></td>
            `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách từ vựng:", error);
  }
}

// Cập nhật lại sự kiện load trang: Khi vừa mở trang web lên, tự động chạy cả Flashcard và Bảng danh sách luôn
window.onload = () => {
  loadFlashcards();
  loadVocabList(); // Tự động hiển thị toàn bộ từ vựng lần đầu tiên
};

// Tự động tải từ vựng khi vừa mở trang web
window.onload = loadFlashcards;

// ==========================================
// 5. TÍNH NĂNG THI GIẤY TRƯỜNG TỪ VỰNG (MỚI)
// ==========================================
let wfExamWords = [];
let wfGlobalInterval = null;
let wfTimeLeftSeconds = 0;

document
  .getElementById("startWfQuizBtn")
  .addEventListener("click", async () => {
    const unit = document.getElementById("wfQuizUnit").value;
    const timeMinutes = parseInt(document.getElementById("wfQuizTime").value);

    clearInterval(wfGlobalInterval); // Reset đồng hồ cũ nếu có

    try {
      const response = await fetch(`${API_URL}?unit=${unit}&level=all`);
      const words = await response.json();

      // Lọc ra NHỮNG TỪ CÓ NHẬP ÍT NHẤT 1 TRƯỜNG TỪ VỰNG
      wfExamWords = words.filter((w) => {
        if (!w.word_family) return false;
        return (
          w.word_family.n ||
          w.word_family.v ||
          w.word_family.adj ||
          w.word_family.adv
        );
      });

      if (wfExamWords.length === 0) {
        alert("Bài học này chưa có từ nào được nhập dữ liệu Trường từ vựng!");
        document.getElementById("wfExamPaper").style.display = "none";
        return;
      }

      // Đảo ngẫu nhiên thứ tự câu hỏi
      wfExamWords.sort(() => Math.random() - 0.5);

      renderWfExamPaper();

      // Mở giấy thi, ẩn kết quả cũ
      document.getElementById("wfExamPaper").style.display = "block";
      document.getElementById("submitWfExamBtn").style.display = "block";
      document.getElementById("wfFinalResult").style.display = "none";

      // Khởi động đồng hồ
      wfTimeLeftSeconds = timeMinutes * 60;
      startWfGlobalTimer();
    } catch (error) {
      console.error(error);
    }
  });

function renderWfExamPaper() {
  const container = document.getElementById("wfQuestionsContainer");
  container.innerHTML = "";

  wfExamWords.forEach((word, index) => {
    // Khung cho mỗi câu hỏi
    const questionDiv = document.createElement("div");
    questionDiv.style.cssText =
      "background: #f9fbfd; padding: 15px; margin-bottom: 15px; border-radius: 6px; border: 1px solid #dcdde1;";

    // Hiển thị từ gốc
    let html = `<h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 18px;">
            Câu ${index + 1}: <span style="color:#2980b9;">${word.english}</span> <span style="font-weight:normal; color:#7f8c8d;">(${word.type}) - ${word.vietnamese}</span>
        </h4>`;
    html += `<div style="display: flex; flex-wrap: wrap; gap: 10px;" id="wf-answers-${word.id}">`;

    // Render ô nhập cho những loại từ có tồn tại trong dữ liệu
    const types = [
      { key: "n", label: "Danh từ (n)" },
      { key: "v", label: "Động từ (v)" },
      { key: "adj", label: "Tính từ (adj)" },
      { key: "adv", label: "Trạng từ (adv)" },
    ];

    types.forEach((t) => {
      if (word.word_family && word.word_family[t.key]) {
        html += `
                <div style="display: flex; align-items: center; gap: 5px;">
                    <label style="font-weight: bold; color: #8e44ad;">${t.label}:</label>
                    <input type="text" data-word-id="${word.id}" data-type="${t.key}" class="wf-input-field" placeholder="Nhập ${t.key}..." style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                </div>`;
      }
    });

    html += `</div>`;
    questionDiv.innerHTML = html;
    container.appendChild(questionDiv);
  });
}

function startWfGlobalTimer() {
  updateTimerDisplay();
  wfGlobalInterval = setInterval(() => {
    wfTimeLeftSeconds--;
    updateTimerDisplay();

    if (wfTimeLeftSeconds <= 0) {
      clearInterval(wfGlobalInterval);
      alert("⏰ HẾT GIỜ! HỆ THỐNG TỰ ĐỘNG THU BÀI!");
      submitWfExam(); // Tự động nộp bài
    }
  }, 1000);
}

function updateTimerDisplay() {
  const minutes = Math.floor(wfTimeLeftSeconds / 60);
  const seconds = wfTimeLeftSeconds % 60;
  const formattedStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  document.getElementById("wfGlobalTimer").innerText = formattedStr;
}

// Khi người dùng bấm nút Nộp Bài
document.getElementById("submitWfExamBtn").addEventListener("click", () => {
  if (confirm("Bạn có chắc chắn muốn nộp bài sớm không?")) {
    clearInterval(wfGlobalInterval);
    submitWfExam();
  }
});

// Hàm chấm điểm toàn bộ tờ giấy thi
function submitWfExam() {
  document.getElementById("submitWfExamBtn").style.display = "none"; // Giấu nút nộp bài

  let totalBlanks = 0;
  let correctBlanks = 0;

  const allInputs = document.querySelectorAll(".wf-input-field");

  // Khóa tất cả các ô nhập liệu (không cho sửa nữa)
  allInputs.forEach((input) => {
    input.disabled = true;
    totalBlanks++;

    const wordId = input.getAttribute("data-word-id");
    const wfType = input.getAttribute("data-type");

    // Tìm lại từ gốc trong mảng wfExamWords
    const wordData = wfExamWords.find((w) => w.id === wordId);
    const correctAnswer = wordData.word_family[wfType].toLowerCase().trim();
    const userAnswer = input.value.toLowerCase().trim();

    if (userAnswer === correctAnswer) {
      correctBlanks++;
      input.style.backgroundColor = "#d5f5e3"; // Xanh lá nhạt
      input.style.borderColor = "#2ecc71";
      input.style.color = "#27ae60";
      input.style.fontWeight = "bold";
    } else {
      input.style.backgroundColor = "#fadbd8"; // Đỏ nhạt
      input.style.borderColor = "#e74c3c";
      input.style.color = "#c0392b";
      // In đáp án đúng ra bên cạnh ô bị sai
      const correctSpan = document.createElement("span");
      correctSpan.style.color = "#e74c3c";
      correctSpan.style.fontWeight = "bold";
      correctSpan.style.marginLeft = "5px";
      correctSpan.innerText = `(Đúng: ${wordData.word_family[wfType]})`;
      input.parentNode.appendChild(correctSpan);
    }
  });

  // Hiển thị tổng kết
  const resultDiv = document.getElementById("wfFinalResult");
  resultDiv.style.display = "block";
  resultDiv.innerHTML = `🎉 BẠN ĐÃ ĐIỀN ĐÚNG: ${correctBlanks} / ${totalBlanks} TỪ`;
}

// ==========================================
// 6. TÍNH NĂNG KIỂM TRA CỤM TỪ (PHRASES)
// ==========================================
let phraseQuizWords = [];
let currentPhraseIndex = 0;
let phraseTimerInterval = null;
let phraseTimeLeft = 10; // Bạn có thể sửa thành 15 giây nếu muốn giống Khu vực 3

document
  .getElementById("startPhraseQuizBtn")
  .addEventListener("click", async () => {
    const unit = document.getElementById("phraseQuizUnit").value;
    const level = document.getElementById("phraseQuizLevel").value;

    try {
      const response = await fetch(`${API_URL}?unit=${unit}&level=${level}`);
      const words = await response.json();

      // BỘ LỌC QUAN TRỌNG: Chỉ lấy những từ có type là 'phrase'
      phraseQuizWords = words.filter((w) => w.type === "phrase");

      if (phraseQuizWords.length === 0) {
        alert("Không tìm thấy Cụm từ nào phù hợp với bộ lọc này!");
        return;
      }

      // Đảo ngẫu nhiên danh sách cụm từ
      phraseQuizWords.sort(() => Math.random() - 0.5);

      // Khởi tạo trạng thái
      phraseQuizWords = phraseQuizWords.map((w) => ({
        ...w,
        userAnswer: "",
        isCorrect: false,
      }));
      currentPhraseIndex = 0;

      document.getElementById("phraseQuizArea").style.display = "block";
      document.getElementById("phraseQuizSummary").style.display = "none";

      loadNextPhrase();
    } catch (error) {
      console.error(error);
    }
  });

function loadNextPhrase() {
  if (currentPhraseIndex >= phraseQuizWords.length) {
    showPhraseSummary();
    return;
  }

  const currentPhrase = phraseQuizWords[currentPhraseIndex];
  document.getElementById("phraseMeaningDisplay").innerText =
    currentPhrase.vietnamese;

  const inputField = document.getElementById("phraseAnswerInput");
  inputField.value = "";

  // Xử lý lỗi bộ nhớ đệm bàn phím (IME BUG) tương tự Khu vực 3
  inputField.blur();
  setTimeout(() => {
    inputField.focus();
  }, 10);

  startPhraseTimer();
}

function startPhraseTimer() {
  clearInterval(phraseTimerInterval);
  phraseTimeLeft = 10; // Reset lại thời gian cho mỗi cụm từ
  document.getElementById("phraseTimerDisplay").innerText = phraseTimeLeft;

  phraseTimerInterval = setInterval(() => {
    phraseTimeLeft--;
    document.getElementById("phraseTimerDisplay").innerText = phraseTimeLeft;

    if (phraseTimeLeft <= 0) {
      clearInterval(phraseTimerInterval);
      checkPhraseAnswer(true); // true = Hết giờ / Bỏ qua
    }
  }, 1000);
}

// Xử lý khi bấm nút Trả lời hoặc Bỏ qua
document
  .getElementById("submitPhraseBtn")
  .addEventListener("click", () => checkPhraseAnswer(false));
document
  .getElementById("skipPhraseBtn")
  .addEventListener("click", () => checkPhraseAnswer(true));

// Hỗ trợ bấm Enter để nộp bài
document
  .getElementById("phraseAnswerInput")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      checkPhraseAnswer(false);
    }
  });

async function checkPhraseAnswer(isSkipped) {
  clearInterval(phraseTimerInterval);
  const inputField = document.getElementById("phraseAnswerInput");
  const userAnswer = inputField.value.trim().toLowerCase();
  const currentPhrase = phraseQuizWords[currentPhraseIndex];
  const correctAnswer = currentPhrase.english.toLowerCase().trim();

  phraseQuizWords[currentPhraseIndex].userAnswer = inputField.value.trim();
  let isAnyLevelChanged = false;

  if (!isSkipped && userAnswer === correctAnswer) {
    phraseQuizWords[currentPhraseIndex].isCorrect = true;

    // ĐÚNG: Tăng level nếu < 4
    if (currentPhrase.level < 4) {
      try {
        await fetch(`${API_URL}/${currentPhrase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: currentPhrase.level + 1 }),
        });
        isAnyLevelChanged = true;
      } catch (e) {
        console.error(e);
      }
    }
  } else {
    // SAI HOẶC BỎ QUA: Chỉ hạ xuống level 3 NẾU đang ở level 4
    phraseQuizWords[currentPhraseIndex].isCorrect = false;

    if (currentPhrase.level === 4) {
      try {
        await fetch(`${API_URL}/${currentPhrase.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level: 3 }),
        });
        isAnyLevelChanged = true;
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Refresh lại dữ liệu ở các khu vực khác nếu có thay đổi level
  if (isAnyLevelChanged) {
    if (typeof loadFlashcards === "function") loadFlashcards();
    if (typeof loadVocabList === "function") loadVocabList();
  }

  currentPhraseIndex++;
  loadNextPhrase();
}

function showPhraseSummary() {
  document.getElementById("phraseQuizArea").style.display = "none";
  const summaryDiv = document.getElementById("phraseQuizSummary");
  const contentDiv = document.getElementById("phraseSummaryContent");

  let correctCount = 0;
  let html = '<ul style="list-style-type: none; padding: 0;">';

  phraseQuizWords.forEach((w) => {
    if (w.isCorrect) correctCount++;

    const color = w.isCorrect ? "#27ae60" : "#e74c3c";
    const icon = w.isCorrect ? "✅" : "🔴";
    const statusText = w.isCorrect ? "Đúng" : "Sai / Bỏ qua";

    html += `<li style="margin-bottom: 10px; padding: 10px; border-radius: 5px; background: #f9fbfd; border-left: 5px solid ${color};">
            ${icon} <strong style="color: #c0392b;">${w.vietnamese}</strong><br>
            Đáp án đúng: <span style="color: #2980b9; font-weight: bold;">${w.english}</span><br>
            Bạn nhập: <span style="font-style: italic; color: ${color}; text-decoration: ${w.isCorrect ? "none" : "line-through"};">${w.userAnswer || '<b style="color:#aaa;">Bỏ qua / Hết giờ</b>'}</span>
        </li>`;
  });
  html += "</ul>";

  // Phần tiêu đề tổng kết điểm số
  const headerHtml = `<h4 style="color: #2c3e50; text-align: center; margin-bottom: 15px;">Bạn đã trả lời đúng: ${correctCount} / ${phraseQuizWords.length} cụm từ</h4>`;

  contentDiv.innerHTML = headerHtml + html;
  summaryDiv.style.display = "block";
}
