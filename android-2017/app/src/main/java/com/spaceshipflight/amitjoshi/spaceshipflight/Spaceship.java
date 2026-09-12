package com.spaceshipflight.amitjoshi.spaceshipflight;
import android.app.Activity;
import android.graphics.Color;
import android.graphics.drawable.BitmapDrawable;
import android.os.SystemClock;
import android.support.v4.content.ContextCompat;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.graphics.Matrix;
import android.graphics.Paint.Align;
import android.os.Handler;
import android.graphics.Bitmap;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.drawable.Drawable;
/**
 * Created by amitjoshi on 12/22/16.
 */
public class Spaceship implements GameItem{
    private float angle;
    private Canvas canvas;
    private int CENTER_X, Y;
    private Drawable shipDrawable;
    private Bitmap shipBitmap;
    private boolean paused = false;
    private int clearBuffer = 0;
    private boolean red = true;
    private Paint paint;
    private Bitmap bitmap;
    private DisplayMetrics dm;
    private MyImageView imageView;
    BulletCase bulletCase;
    private byte count = (byte) 0;
    private boolean first = true;
    private float x, y, dx, dy;
    private Handler scoreHandler;
    private Matrix matrix;
    private int width, height, length;
    private boolean thrust;
    private Context context;
    public Spaceship(Context context, Canvas canvas, MyImageView imageView, Bitmap bm, Handler scoreHandler, DisplayMetrics dm, BulletCase bulletCase){
        this.canvas = canvas;
        this.imageView = imageView;
        bitmap = bm;
        this.scoreHandler = scoreHandler;
        imageView.setBit(bitmap); //take out perhaps
        this.dm = dm;
        this.context = context;
        imageView.handler.sendEmptyMessage(0);
        this.paint = new Paint();
        paint.setColor(Color.BLACK);
        paint.setStrokeWidth(4);
        angle = (float)0;
        height = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 32, dm)); //change based on screen size
        width = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 32, dm));
        clearBuffer = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 5, dm));
        length = width;
        Y = imageView.getMeasuredHeight();
        this.bulletCase = bulletCase;
        int textSize = (int)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 60, dm));
        paint.setTextAlign(Align.CENTER);
        paint.setTextSize(textSize);
        matrix = new Matrix();
        CENTER_X = canvas.getWidth()/2;
        Y = canvas.getHeight()/2;
        x = CENTER_X;
        y = Y;
        //x = 300;
        //y = 400;
        matrix.preTranslate(x, y);
        matrix.setTranslate(x, y);
        matrix.postTranslate(x, y);
        if(red) {
            shipDrawable = ContextCompat.getDrawable(context, R.mipmap.newspaceship);
        }
        else{
            shipDrawable = ContextCompat.getDrawable(context, R.mipmap.bluenewspaceship);
        }
        shipBitmap = ((BitmapDrawable) shipDrawable).getBitmap();
        shipBitmap = Bitmap.createScaledBitmap(shipBitmap, width, height, false);
    }
    public void setRed(boolean red){
        this.red = red;
    }
    public void setCENTER_X(int cx){
        this.CENTER_X = cx;
    }
    public void setY(int cy){
        this.Y = cy;
    }
    public void setThrust(boolean t){
        this.thrust = t;
    }
    public void counterClockwise(){
        if(!paused) {
            //clear();
            angle -= 5;
        }
    }
    public void clockwise(){
        if(!paused) {
            //clear();
            angle += 5;
        }
    }
    public void clear(){
        paint.setColor(Color.BLACK);
        canvas.drawRect(x-width/2-clearBuffer, y-height/2-clearBuffer, x+width/2+clearBuffer, y+width/2+clearBuffer, paint); //height can work equally well since image is a square
    }
    public void setCanvas(Canvas c){
        this.canvas = c;
    }
    public void setImageView(MyImageView imageView1){
        this.imageView = imageView1;
    }
    private void thrust(){
        float oldDx = dx;
        float oldDy = dy;
        if(Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)) < clearBuffer*.85){ //change to dp
            dx = (float)(.24 * Math.cos(Math.toRadians(angle - 90))) + oldDx;
            dy = (float)(.24 * Math.sin(Math.toRadians(angle - 90))) + oldDy;
        }
        matrix.setTranslate(x+width/2, y+width/2);
    }
    public void fire(){
        Bullet b = new Bullet(canvas, bulletCase, 90-angle, (float)(x + (Math.cos(Math.toRadians(90-angle)) * length/2)),
                (float)(y - (Math.sin(Math.toRadians(90-angle)) * length/2)), false, scoreHandler, dm);
        bulletCase.add(b);
    }
    public void pause(){
        paused = true;
        bulletCase.pause();
        paint.setColor(Color.YELLOW);
        canvas.drawText("Paused", (int)(canvas.getWidth()/2), (int)(canvas.getHeight()/2), paint);
    }
    public void stop(){
        paused = true;
        bulletCase.pause();
        paint.setColor(Color.YELLOW);
        canvas.drawText("Game Over", (int)(canvas.getWidth()/2), (int)(canvas.getHeight()/2), paint);
    }
    public void play(){
        paused = false;
        bulletCase.play();
        paint.setColor(Color.BLACK);
        canvas.drawText("Paused", (int)(canvas.getWidth()/2), (int)(canvas.getHeight()/2), paint);
    }
    public int getLength(){
        return height;
    }
    public int getWidth()
    {
        return width;
    }
    public void setX(int x1){
        this.x = x1;
    }
    public int getHeight(){
        return height;
    }
    public void drawMe(){
        clear();
        matrix.reset();
        matrix.postTranslate(-shipBitmap.getWidth()/2, -shipBitmap.getHeight()/2); // Centers image //controls start point
        matrix.postRotate(angle);
        matrix.postTranslate(x, y); //controls rotation point

        canvas.drawBitmap(shipBitmap, matrix,paint);
        tick();
    }
    public int getCENTER_X(){
        return CENTER_X;
    }
    public void tick(){
        if(this.thrust){
            thrust();
        }
        if(!paused) {
            x += dx;
            y += dy;
            dx *= .995;
            dy *= .995;
            if(x > canvas.getWidth()+shipBitmap.getWidth()/2){
                x = 0;
            }
            else if(x < 0-shipBitmap.getWidth()/2){
                x = canvas.getWidth();
            }
            if(y > canvas.getHeight() + shipBitmap.getHeight()/2){
                y = 0;
            }
            else if(y < 0-shipBitmap.getHeight()/2){
                y = canvas.getHeight();
            }
            bulletCase.tick();
        }

    }
}
