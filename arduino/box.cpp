#include <gfxfont.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SPITFT.h>
#include <Adafruit_SPITFT_Macros.h>
#include <Ethernet.h>
#include <Wire.h>
#include <Adafruit_LEDBackpack.h>
#include <SPI.h>
#include <string.h>
#define IDLE_TIMEOUT_MS 3000

EthernetClient client;
char urlPath[60];
char getString[60];
Adafruit_AlphaNum4 alpha4 = Adafruit_AlphaNum4();

IPAddress gameServer(192, 168, 1, 200);
IPAddress dnServer(192, 168, 1, 1);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);

unsigned long start, current, elapsed;
int count = 0;
int oneDisplay = 0;
int tenDisplay = 0;
int onetencarrier = 0;
int hundredDisplay = 0;
int tenHundredCarrier = 0;
int milSec = 0;
int switchPin = 2;
int setupPin = 7;
int setupQ;
int relayHigh = 9;
int relayPin = 8;
bool running = false;
bool requesting = false;

void setup()
{
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect.
  }
  Serial.println(F("Starting up Hilmor leaderboard game.\n")); 

  alpha4.begin(0x70); // pass in the address
  alpha4.setBrightness(8);

  pinMode(switchPin, INPUT);
  digitalWrite(switchPin, HIGH);

  pinMode(relayHigh, OUTPUT);
  digitalWrite(relayHigh, HIGH);

  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);

  initGameServer();
  
  Serial.println("Setup complete. Ready to play");

  updateDisplay('P', 'L', 'A', 'Y');
  delay(3000);
  clearDisplay();
}

// main program loop
void loop()
{
  if (client.available()) {
    // while the connnection is active, we don't really care about the rest
    char c = client.read();
    Serial.write(c);
  } else if (!client.connected() && requesting == true) {
      Serial.println();
      Serial.println("connection closed");
      requesting = false;
      Serial.println("Submitted time");
      delay(5000);
      alpha4.blinkRate(HT16K33_BLINK_OFF); // stop flashing
      delay(5000);
      clearDisplay();
      Serial.println("Ready to play again");
  } else if (digitalRead(switchPin) == LOW) {
    // switch is pressed - pullup keeps pin high normally
    Serial.println("Button pressed, starting timer");
    digitalWrite(relayPin, HIGH);
    running = true; // toggle running variable
    start = millis(); // record our start tim
    displaySecond(); // indicate via LED
    delay(500); // delay to debounce switch
  }
}

// Using this function to display second on display.
void displaySecond() {
  float h,m,s,ms;
  unsigned long over;
  clearDisplay();
  while (running == true) {

    current = millis();
    elapsed=current-start;
    h=int(elapsed/3600000) ;
    over=elapsed%3600000;
    s=int(over/1000) ;
    ms=over%1000;
  
    count = s;
    //get 1st digit
    oneDisplay = (count %10);
    // get 2nd digit
    onetencarrier = count - oneDisplay ;
    tenDisplay = (onetencarrier / 10) % 10 ;
    //  Serial.println(tenDisplay);
  
    // get 3rd digit
    tenHundredCarrier = count - tenDisplay;
    hundredDisplay = (tenHundredCarrier / 100);
  
    // convert the numbers to ascii ( 48 = 0 ). Hacky and ugly, but works! 
    tenDisplay = tenDisplay + 48;
    oneDisplay = oneDisplay + 48;
    hundredDisplay = hundredDisplay + 48;
    milSec = (ms / 100) + 48;

    //  Serial.println(elapsed);
    if (elapsed < 999999){
      alpha4.writeDigitAscii(0,hundredDisplay);
      alpha4.writeDigitAscii(1,tenDisplay);
      alpha4.writeDigitAscii(2,oneDisplay, true);
      alpha4.writeDigitAscii(3,milSec);
      alpha4.writeDisplay();
    } else {
      // IF elapsed time is over 999999ms, stop showing time.
      alpha4.writeDigitAscii(0,'T');
      alpha4.writeDigitAscii(1,'I');
      alpha4.writeDigitAscii(2,'M');
      alpha4.writeDigitAscii(3,'E');
      alpha4.writeDisplay();
      running = false;
      delay(10000);
      clearDisplay();
    }
    
    if (digitalRead(switchPin) == LOW && elapsed > 500) {
      Serial.println("Looks like we're done. Flash Display and post the time");
      alpha4.blinkRate(HT16K33_BLINK_1HZ); // set flashing to 1/sec
      digitalWrite(relayPin, LOW);
      running = false;
      Serial.println(elapsed);
      Serial.println("Submit time HERE!!!");
      sendTime(elapsed);
    }
  }
}

void clearDisplay() {
  Serial.println("Clearing display back to 000.0");
  alpha4.writeDigitAscii(0,'0');
  alpha4.writeDigitAscii(1,'0');
  alpha4.writeDigitAscii(2,'0',true);
  alpha4.writeDigitAscii(3,'0');
  alpha4.writeDisplay();
}

void updateDisplay(char a, char b, char c, char d) {
    Serial.print("Updating Disply :: ");
    Serial.print(a);
    Serial.print(b);
    Serial.print(c);
    Serial.println(d);

    alpha4.writeDigitAscii(0,a);
    alpha4.writeDigitAscii(1,b);
    alpha4.writeDigitAscii(2,c);
    alpha4.writeDigitAscii(3,d);
    alpha4.writeDisplay();
}

void setupQueue(int qNum) {
    setupQ = qNum;

    Serial.print("setup for queue :: ");
    Serial.println(qNum);

    IPAddress ip(192, 168, 1, qNum*10);
    byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED };

    Ethernet.begin(mac, ip, dnServer, gateway, subnet);
}

void initGameServer() {
    pinMode(setupPin, INPUT);
    digitalWrite(setupPin, HIGH);

    if ( digitalRead(setupPin) == LOW ) {
        setupQueue(2);
    } else {
        setupQueue(1);
    }
    
    Serial.print("Local IP = ");
    Serial.println(Ethernet.localIP());
}

void sendTime(unsigned long time) {
  // close any connection before send a new request.
  // This will free the socket on the WiFi shield
  client.stop();
  requesting = true;

  Serial.print("Sending Time :: ");
  Serial.println(time);

  sprintf(urlPath, "/track/%d/%lu", setupQ, elapsed);
  sprintf(getString, "GET %s HTTP/1.1", urlPath);
  Serial.println(getString);

  // if there's a successful connection:
  if (client.connect(gameServer, 3000)) {
    Serial.println("connecting...");
    
    client.println(getString);
    client.println("Connection: close");
    client.println();
  } else {
    Serial.println("connection failed");
  }
}