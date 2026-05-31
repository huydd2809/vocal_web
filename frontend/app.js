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
