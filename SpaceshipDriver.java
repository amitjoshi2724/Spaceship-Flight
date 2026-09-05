import java.awt.image.*;
import javax.swing.*;
import java.awt.*;
import java.awt.geom.*;
import java.awt.event.*;
import java.util.*;
import javax.swing.event.*;
public class SpaceshipDriver{
   public static void main(String[] args){
      JFrame frame = new JFrame();
      frame.setContentPane(new SpaceshipPanel());
      frame.pack();
      frame.setLocationRelativeTo(null);
      frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
      frame.setTitle("Spaceship");
      frame.setVisible(true);
   }
}
class SpaceshipPanel extends JPanel{
   private BufferedImage myImage = new BufferedImage(1800, 1000, BufferedImage.TYPE_INT_RGB);
   private Graphics2D myBuffer = (Graphics2D)(myImage.getGraphics());
   private javax.swing.Timer timer = new javax.swing.Timer(5, new TimerListener());
   private Spaceship spaceship;
   private RockMaker rm = new RockMaker(myBuffer, 1800, 1000);
   private Thread t1, rockThread;
   public SpaceshipPanel(){
      setPreferredSize(new Dimension(1800, 1000));
      spaceship = new Spaceship(myBuffer, myImage, rm);
      myBuffer.setBackground(Color.BLACK.darker());
      t1 = new Thread(spaceship);
      myBuffer.clearRect(0, 0, myImage.getWidth(), myImage.getHeight());
      addKeyListener(
            new KeyAdapter(){
               private HashSet<Integer> set = new HashSet<Integer>();
               public void keyPressed(KeyEvent e){
                  spaceship.drawMe();
                  if(spaceship.getActive()){
                     set.add(e.getKeyCode());
                     if(set.size() > 0){
                        for(Integer i : set){
                           spaceship.drawMe();
                           if(i == KeyEvent.VK_RIGHT){
                              spaceship.turnRight();
                           }
                           else if(i == KeyEvent.VK_LEFT){
                              spaceship.turnLeft();
                           }
                           else if(i == KeyEvent.VK_UP){
                              spaceship.movingShip();
                              spaceship.move();
                           }
                           else if(i == KeyEvent.VK_A){
                              spaceship.movingShip();
                           }
                           else if(i == KeyEvent.VK_SPACE){
                              spaceship.shoot(true);
                           }
                           else if(i == KeyEvent.VK_L){
                              spaceship.shoot(false);
                           }
                        }
                     }
                  }
               }
               public void keyReleased(KeyEvent k){
                  set.remove(k.getKeyCode());
                  if(k.getKeyCode() == KeyEvent.VK_UP || k.getKeyCode() == KeyEvent.VK_A){
                     spaceship.stopShip();
                  }
                  spaceship.drawMe();
               }
            });
      setFocusable(true);
      rockThread = new Thread(rm);
      timer.start();
      t1.start();
      rockThread.start();
   }
   public class TimerListener implements ActionListener{
      public void actionPerformed(ActionEvent e){
         spaceship.drawMe();
         repaint();
      }
   }
   public void paintComponent(Graphics g){
      g.drawImage(myImage, 0, 0, getWidth(), getHeight(), null);
   }
}
class Spaceship implements Runnable{
   private BufferedImage ship;
   private BufferedImage savedShip;
   private Graphics2D myBuffer = null;
   private javax.swing.Timer timer = new javax.swing.Timer(5, new TimerListener());
   private int angle;
   private int lives = 4;
   private boolean moving = false;
   private double x, y;
   private double dx = 0, dy = 0, oldDx, oldDy;
   private BufferedImage movingShip, brokenShip;
   private BufferedImage myImage;
   private RockMaker rm;
   private boolean active = true;
   public Spaceship(Graphics2D myBuffer, BufferedImage myImage, RockMaker rm){
      this.myBuffer = myBuffer;
      this.myImage = myImage;
      this.rm = rm;
      javax.swing.ImageIcon icon = new javax.swing.ImageIcon("newspaceship.png");
      javax.swing.ImageIcon icon2 = new javax.swing.ImageIcon("newspaceshipmoving2.png");
      javax.swing.ImageIcon icon3 = new javax.swing.ImageIcon("brokennewspaceship.png");
      movingShip = new BufferedImage(icon.getIconWidth(),
            icon2.getIconHeight(),
            BufferedImage.TYPE_INT_RGB);
      Graphics g2 = movingShip.createGraphics();
   // paint the Icon to the BufferedImage.
      icon2.paintIcon(null, g2, 0,0);
      g2.dispose();
      brokenShip = new BufferedImage(
         icon.getIconWidth(),
         icon.getIconHeight(),
         BufferedImage.TYPE_INT_RGB);
      Graphics g3 = brokenShip.createGraphics();
      icon3.paintIcon(null, g3, 0,0);
      g3.dispose();
      ship = new BufferedImage(
         icon.getIconWidth(),
         icon.getIconHeight(),
         BufferedImage.TYPE_INT_RGB);
      Graphics g = ship.createGraphics();
   // paint the Icon to the BufferedImage.
      icon.paintIcon(null, g, 0,0);
      g.dispose();
      x = 500; 
      y = 300;
      angle = 0;
      
   }
   public boolean getActive(){
      return active;
   }
   public void setActive(boolean b){
      active = b;
   }
   public void run(){
      timer.start();
   }
   public void movingShip(){
      moving = true;
   }
   public void stopShip(){
      moving = false;
   }
   public class TimerListener implements ActionListener{
      public void actionPerformed(ActionEvent e){
         myBuffer.setColor(Color.BLACK);
         if(!moving){
            myBuffer.fillRect((int)x - 20, (int)y - 20, (int)(movingShip.getWidth() * 1.414) + 1, (int)(movingShip.getHeight() * 1.414) + 1);
         }
         else{
            myBuffer.fillRect((int)x - 20, (int)y - 20, (int)(movingShip.getWidth() * 1.414) + 1, (int)(movingShip.getHeight() * 1.414) + 1);
         }
         x += dx;
         y += dy;
         if(x < 0){
            x = 1800;
         }
         if(y < 0){
            y = 1000;
         }
         if(y > 1000){
            y = 0;
         }
         if(x > 1800){
            x = 0;
         }
         /*oldDx *= .9;
         oldDy *= .9;
         dx *= .98;
         dy *= .98;
         */
         oldDx *= .94;
         oldDy *= .94;
         dx *= .99;
         dy *= .99;
         dx += oldDx;
         dy += oldDy;
         ArrayList<Rock> list = rm.getRockArrayList();
         for(Rock r : list){
            if(r.contains(x +(ship.getWidth() / 2) + ((ship.getWidth() / 2) * Math.cos(Math.toRadians(angle - 90))),
             y + (ship.getHeight() / 2) + (ship.getWidth()/2) * Math.sin(Math.toRadians(angle - 90)))){
               lives--;
               active = false;
               r.pop();
            }
         }
         drawMe();
      }
   }
   public void move(){
      double oldDx = dx;
      double oldDy = dy;
      if(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) < 19){
         dx = 1.5 * Math.cos(Math.toRadians(angle - 90)) + oldDx;
         dy = 1.5 * Math.sin(Math.toRadians(angle - 90)) + oldDy;
      }
   }
   public void shoot(boolean b){
      if(b){
         Thread th = new Thread(new Bullet(x +(ship.getWidth() / 2) + ((ship.getWidth() / 2) * Math.cos(Math.toRadians(angle - 90))), y + (ship.getHeight() / 2) + (ship.getWidth()/2) * Math.sin(Math.toRadians(angle - 90)),angle - 90, myBuffer, rm.getRockArrayList()));
         th.start();
      }
   }
   public void turnLeft(){
      angle -= 10;
   }
   public void turnRight(){
      angle += 10;
   }
   public void drawMe(){
      if(active){
         if(!moving){
            AffineTransform tx = new AffineTransform();
            tx.rotate(Math.toRadians(angle), (int)x  + (int)(ship.getWidth()/2), (int)y + (int)(ship.getHeight()/2));
            tx.translate(x, y);
            myBuffer.drawImage(ship, tx, null); 
         }
         else{
            AffineTransform tx = new AffineTransform();
            tx.rotate(Math.toRadians(angle), (int)x  + (int)(movingShip.getWidth()/2), (int)y + (int)(movingShip.getHeight()/2));
            tx.translate(x, y);
            myBuffer.drawImage(movingShip, tx, null); 
         //System.out.println("I am here");
         //myBuffer.drawImage(ship, (int)x, (int)y, movingShip.getWidth(), movingShip.getHeight(), null);
         }
      }
      else{
         AffineTransform tx = new AffineTransform();
         tx.rotate(Math.toRadians(angle), (int)x  + (int)(brokenShip.getWidth()/2), (int)y + (int)(brokenShip.getHeight()/2));
         tx.translate(x, y);
         myBuffer.drawImage(brokenShip, tx, null); 
      }
   }
}
class Spot{
   private double x, y, r;
   private Color c;
   private static int count = 0;
   private boolean popped = false;
   public Spot(double x, double y, double r, Color c){
      this.x = x;
      this.y = y;
      this.r = r;
      this.c = c;
   }
   public double getX(){
      return x;
   }
   public double getY(){
      return y;
   }
   public double getCenterX(){
      return x + getRadius();
   }
   public double getCenterY(){
      return y + getRadius();
   }
   public double getRadius(){
      return r;
   }
   public Color getColor(){
      return c;
   }
   public void setColor(Color c1){
      this.c = c1;
   }
   public void setX(double x){
      this.x = x;
   }
   public void setY(double y){
      this.y = y;
   }
   public double getDiameter(){
      return 2 * getRadius();
   }
   public void setRadius(double radius){
      this.r = radius;
   }
   public boolean intersect(Spot s){
     
      double d = distance(this.getX() + this.getRadius(), this.getY() + this.getRadius(), s.getX() + s.getRadius(), s.getY() + s.getRadius()); //add + 5 to s.getY()  
      if( d <= this.getRadius() + s.getRadius()){
         if(!s.getPopped()){
            s.setPopped(true);
            count++;
            return true;
         }
      }
      return false;
   }
   public static int getCount(){
      return count;  
   }
   private double distance(double x1, double y1, double x2, double y2)
   {
      return Math.sqrt(Math.pow((x2 - x1), 2) + 
                      Math.pow((y2 - y1), 2) );  	
   }
   private void setPopped(boolean p){
      this.popped = p;
   }
   public boolean getPopped(){
      return popped;
   }
   public void drawMe(Graphics2D myBuffer){
      myBuffer.setColor(getColor());
      myBuffer.fillOval((int)(getX()), (int)(getY()), (int)getDiameter(), (int)getDiameter());
   }
}
class Bullet extends Spot implements Runnable{
   private double dx, dy;
   private boolean active;
   private int rightEdge = 605, leftEdge = 12;
   private int bottomEdge = 410;
   private javax.swing.Timer t1;
   private static boolean paused = false;
   private Graphics2D myBuffer;
   private ArrayList<Rock> rockList;
   public Bullet(double x, double y, double angle, Graphics2D g2D, ArrayList<Rock> rockList){
      super(x, y, 5, Color.YELLOW.brighter().brighter().brighter().brighter().brighter().brighter());
      setX(getX() - getRadius());
      setY(getY() - getRadius());
      this.rockList = rockList;
      active = true;
      myBuffer = g2D;
      /*dx = (Math.abs(270.0 - angle) / 10.0);
      dy = -1.0 * (9.0 - dx);
      if(angle < 270){
         dx *= -1;
      }*/
      dx = 20 * Math.cos(Math.toRadians(angle));
      dy = 20 * Math.sin(Math.toRadians(angle));
   
   }
   public void setActive(boolean b){
      this.active = b;
   }
   public boolean getActive(){
      return active;
   }
   public void run(){
      t1 = new javax.swing.Timer(7, new Listener(myBuffer));
      t1.start();
   }
   public static void setPaused(boolean b){
      paused = b;
   }
   private class Listener implements ActionListener{
      private Graphics2D myBuffer;
      public Listener(Graphics2D g){
         myBuffer = g;
      }
      public void actionPerformed(ActionEvent e){
         if(!active){
            t1.stop();
            drawMe(myBuffer);
            clear((int)getX(), (int)getY());
            return;
         }
         myBuffer.setColor(Color.BLACK);
         myBuffer.fillOval((int)getX(), (int)getY(), (int)getRadius() * 2, (int)getRadius() * 2);
         tick();
         drawMe(myBuffer);
      }
   }
   public void clear(int x, int y){
      myBuffer.setColor(Color.BLACK);
      myBuffer.fillOval((int)(getX() - getRadius()), (int)(getY() - getRadius()), (int)getRadius() * 4, (int)getRadius() * 4);   }
   public void tick()
   {
      if(getX() > 1800 || getY() > 1000 || getX() < 0 || getY() < 0){
         active = false;
      }
      
      setX(getX() + dx);
      setY(getY() + dy);
      for(Rock r : rockList){
         if(r.getPopped() || !r.getActive()){
            continue;
         }
         if(r.contains(this)){
            r.pop();
            active = false;
         } 
      } 
   }
   public boolean getAlive(){
      return active;
   }
}
class Rock implements Runnable{
   private float dy, dx;
   private double x = 0, y = 0;
   private static int misses = 0;
   private boolean active = true;
   private static boolean paused = false;
   private javax.swing.Timer t1;
   private Graphics2D myBuffer;
   private double halfspan = 25 * Math.sqrt(2);
   public ArrayList<Polygon> list = new ArrayList<Polygon>(6);
   public int type; 
   private boolean popped = false;
   private Polygon p;
   public Rock(Graphics2D g2D, byte size){
      this.myBuffer = g2D;
      //dy = -.75;
      size *= 2;
      if(Math.random() > .5){
         size += 1;
      }
      double a = Math.random();
      if(a < .25){
         x = 0;
         y = (int)(Math.random() * 1000);
         dx =  (5 + (int)(Math.random() * 8));
         dy = -10 + (int)(Math.random() * (y/500) * 15); //look
      }
      else if(a < .5){
         y = 0;
         dy = (5 + (int)(Math.random() * 8));
         x = (int)(Math.random() * 1800);
         dx = -10 + (int)(Math.random() * (x/500) * 15);
      }
      else if(a < .75){
         x = 1815;
         y = (int)(Math.random() * 1000);
         dx = -1 * (5 + (int)(Math.random() * 8));
         dy = -1 * (-10 + (int)(Math.random() * (y/500) * 15));
      }
      else{
         y = 1015;
         dy = -1 * (dx = 5 + (int)(Math.random() * 8));
         x = (int)(Math.random() * 1800);
         dx = -1 * (-10 + (int)(Math.random() * (x/500) * 15));
      }
      dx *= .5;
      dy *= .5;
      int[] xpoints = {(int)x, (int)x + 25, (int)x + 15, (int)x - 5, (int)x - 8};
      int[] ypoints = {(int)y, (int)y + 5, (int)y + 30, (int)y + 25, (int)y + 15};
      list.add(new Polygon(xpoints, ypoints, 5));
      this.type = 0; //change later;
      if(type == 0){
         halfspan = 25 * Math.sqrt(2);
      }
      p = list.get(type);
      t1 = new javax.swing.Timer(10, new Listener(myBuffer));
   }
   public static void setPaused(boolean b){
      paused = b;
   }
   public boolean getPopped(){
      return popped;
   }
   public void pop(){
      popped = true;
      active = false;
      clear();
   }
   public boolean contains(double x, double y){
      return p.contains((int)x, (int)y);
   }
   public boolean contains(Bullet b){
      ArrayList<Double> list = new ArrayList<Double>(10);
      for(int i = 0; i < p.npoints; i++){
         double a = Math.sqrt(Math.pow(b.getX() - 4 - p.xpoints[0], 2) + Math.pow(b.getY() - 4 - p.ypoints[0], 2));
         if(a < b.getRadius()){
            return true;
         }
         list.add(a);
      }
      double total = 0;
      for(int i = 0; i < list.size(); i++){
         total += list.get(i);
      }
      if((total/list.size()) < getRadius())  
         return true;
      return false;
      
      /*for(double i = b.getX(); i < b.getX() + b.getDiameter(); i++){
         for(double j = b.getY(); j < b.getY() + b.getDiameter(); j++){
            if(p.contains(i, j)){
               return true;
            }
         }
      }
      return false;*/
   }
   public double getRadius(){
      return halfspan;
   }
   public void clear(){
      myBuffer.setColor(Color.BLACK);
      myBuffer.fillPolygon(p);
   }
   public void tick(){
      if(!paused){
         myBuffer.setColor(Color.BLACK);
         myBuffer.fillPolygon(p);
         int[] xpoints = p.xpoints;
         for(int i = 0; i < xpoints.length; i++){
            xpoints[i] += dx;
         }
         int[] ypoints = p.ypoints;
         for(int i = 0; i < ypoints.length; i++){
            ypoints[i] += dy;
         }
         p = new Polygon(xpoints, ypoints, xpoints.length);
         x += dx;
         y += dy;
      }
   }
   public static int getMisses(){
      return misses;
   }
   public void run(){
      t1.start();
   }
   private class Listener implements ActionListener{
      private Graphics2D myBuffer;
      public Listener(Graphics2D g){
         myBuffer = g;
      }
      public void actionPerformed(ActionEvent e){
         if(p.ypoints[0] < -20 || p.ypoints[0] > 1030 ||p.xpoints[0] < -20 || p.xpoints[0] > 1830){
            active = false;
            clear();
            t1.stop();
         }
         if(!active){
            t1.stop();
            return;
         }
         tick();
         drawMe(myBuffer);
         
      }
   }
   public boolean getActive(){
      return active;
   }
   public void drawMe(Graphics2D myBuffer){
      if(!getPopped()){
         myBuffer.setColor(Color.GRAY);
         myBuffer.fillPolygon(p);
      }
      else{
         System.out.println("nope");
      }
   }
}
class RockMaker implements Runnable{
   private Graphics2D myBuffer;
   private final int DIAMETER = 7;
   private int rBound, bBound;
   private int remaining = 1800;
   private javax.swing.Timer bMTimer, playTimer;
   private ArrayList<Rock> rockArrayList = new ArrayList<>();
   private ArrayList<Thread> threadArrayList = new ArrayList<>();
   public RockMaker(Graphics2D g2D, int rBound, int bBound){
      this.myBuffer = g2D;
      this.rBound = rBound;
      this.bBound = bBound;
   }
   public void run(){
      bMTimer = new javax.swing.Timer(500, new BMListener());
      playTimer = new javax.swing.Timer(1, new PlayListener());
      bMTimer.start();
      playTimer.start();
   }
   public void stop(){
      playTimer.stop();
      bMTimer.stop();
   }
   public void start(){
      bMTimer.setInitialDelay(remaining);
      bMTimer.start();
      playTimer.start();
   }
   private class PlayListener implements ActionListener{
      public void actionPerformed(ActionEvent e){
         if(remaining > 0)
            remaining--;
         else
            remaining = 1800;
      }
   }

   private class BMListener implements ActionListener{
      public void actionPerformed(ActionEvent e){
         /*int i = 0;
         if(rockArrayList.size() > 0){
            i = 1;
         }
         for(int d = 0; d < i; d++){
            if(rockArrayList.get(d).getPopped()){
               rockArrayList.poll();
               threadArrayList.poll();
            }
         }*/
         RockMaker.this.clearer();
         Rock b = new Rock(myBuffer, (byte)(Math.random() * 3));
         rockArrayList.add(b);
         Thread thread = new Thread(b);
         threadArrayList.add(thread);
         thread.start();
      }
   }
   public void clearer(){
      for(int i = 0; i < rockArrayList.size(); i++){ // do this with bullets too if necessary
         if(rockArrayList.get(i).getPopped()){
            rockArrayList.remove(i);
            threadArrayList.remove(i);
         }
      }
   }
   public ArrayList<Rock> getRockArrayList(){
      return rockArrayList;
   }
}