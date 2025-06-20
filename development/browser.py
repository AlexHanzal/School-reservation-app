import sys
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QHBoxLayout, QPushButton
from PyQt5.QtWebEngineWidgets import QWebEngineView
from PyQt5.QtCore import QUrl

class MiniBrowser(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Responsive Test")

        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl("http://localhost:3000/reservation/app"))

        sizes = {
            "Mobile": (375, 667),
            "Tablet": (768, 1024),
            "Laptop": (1366, 768),
            "Desktop": (1920, 1080)
        }

        btns = QHBoxLayout()
        for label, (w, h) in sizes.items():
            btn = QPushButton(label)
            btn.clicked.connect(lambda _, w=w, h=h: self.resize(w, h))
            btns.addWidget(btn)

        layout = QVBoxLayout()
        layout.addLayout(btns)
        layout.addWidget(self.browser)
        self.setLayout(layout)
        self.resize(1366, 768)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    win = MiniBrowser()
    win.show()
    sys.exit(app.exec_())
