package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Handler;
import android.util.DisplayMetrics;
import android.util.TypedValue;

/**
 * Created by amitjoshi on 12/23/16.
 */
public class Bullet implements GameItem{
    private Canvas canvas;
    private Paint paint;
    private float dx, dy;
    private BulletCase bulletCase;
    private float x, y;
    private boolean hit = false;
    private DisplayMetrics dm;
    private Handler scoreHandler;
    public int radius;
    private boolean accessor;
    public Bullet(boolean accessor){
        this.accessor = accessor;
    }
    public Bullet(Canvas c, BulletCase bulletCase, float angle, float x, float y, boolean accessor, Handler scoreHandler, DisplayMetrics dm){
        canvas = c;
        this.dm = dm;
        this.bulletCase = bulletCase;
        this.paint = new Paint();
        this.scoreHandler = scoreHandler;
        this.accessor = accessor;
        if(!accessor) {
            paint.setColor(Color.DKGRAY);
            dx = (float) (Math.cos(Math.toRadians(angle)) * TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 7, dm)); //change based on screen size
            dy = (float) (Math.sin(Math.toRadians(angle)) * TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 7, dm));
        }
        radius = (int)TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 2, dm); //change to dp
        this.x = x;
        this.y = y;
    }
    public void hit(){
        hit = true;
    }
    public void clear(){
        paint.setColor(Color.BLACK);
        canvas.drawCircle(x, y, radius*2, paint);
    }
    public float getX(){
        return x;
    }
    public float getY(){
        return y;
    }
    public int getRadius(){
        return radius;
    }
    public void tick(){
        clear();
        x += this.dx;
        y -= this.dy;
        drawMe();
        if(x + (2*this.radius) < 0){
            this.hit();
            bulletCase.remove(this);
        }
        else if(y + (2 * this.radius) < 0){
            this.hit();
            bulletCase.remove(this);
        }
        else if(x > canvas.getWidth() + this.radius){
            this.hit();
            bulletCase.remove(this);
        }
        else if (y > canvas.getHeight() + this.radius){
            this.hit();
            bulletCase.remove(this);
        }
    }
    public void drawMe(){
        if(!accessor && !hit) {
            paint.setColor(Color.YELLOW);
            canvas.drawCircle(x, y, radius*2, paint);
            paint.setColor(Color.BLUE);
            canvas.drawCircle(x, y, 2, paint);
        }
    }
    public boolean getHit(){
        return hit;
    }
}
