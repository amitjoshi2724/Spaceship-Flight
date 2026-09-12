package com.spaceshipflight.amitjoshi.spaceshipflight;

import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Handler;
import android.util.DisplayMetrics;
import android.util.TypedValue;

/**
 * Created by amitjoshi on 12/23/16.
 */
public class Rock{
    private float dx, dy;
    private int color;
    private float x, y;
    private int imgWidth, imgHeight;
    private int radius;
    private int stickLength;
    private Canvas canvas;
    private boolean accessor;
    private Paint paint;
    private static int count, misses = 0;
    private boolean popped = false;
    private RockCase rockCase;
    private Paint colorPaint;
    private Paint blackPaint;
    private BulletCase bulletCase;
    private Polygon polygon;
    private Handler scoreHandler;
    private DisplayMetrics dm;
    private int[] xpoints;
    private int[] ypoints;
    public Rock(boolean accessor){
        this.accessor = accessor;
        this.count = 0;
        this.misses = 0;
    }
    public Rock(int color1, int imgWidth, int imgHeight, RockCase rockCase,
                   Canvas c, int gunLength, int gunX, BulletCase bulletCase1,
                   boolean accessor, Handler scoreHandler, DisplayMetrics displayMetrics,
                    Paint paint, Paint blackPaint, float dx, float dy, float x, float y,
                    Paint whitePaint, int[] xpoints, int[] ypoints){
        this.color = color1;
        this.dm = displayMetrics;
        this.x = x;
        this.y = y;
        colorPaint = new Paint();
        colorPaint.setStyle(Paint.Style.FILL);
        colorPaint.setColor(color1);
        this.scoreHandler = scoreHandler;
        this.bulletCase = bulletCase1;
        this.blackPaint = blackPaint;
        this.accessor = accessor;
        this.canvas = c;
        this.paint = blackPaint;
        this.rockCase = rockCase;
        this.xpoints = xpoints;
        this.ypoints = ypoints;
        polygon = new Polygon(xpoints, ypoints, xpoints.length, dx, dy, canvas, paint, blackPaint);
        this.radius = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 15, dm);
        this.stickLength = (int)TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 67, dm);
        this.imgHeight = imgHeight;
        this.imgWidth = imgWidth;
        //dy = (float)(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 1, dm) * 3);
        this.dx = dx;
        this.dy = dy;
    }
    public float getX(){
        return x;
    }
    public float getY(){
        return y;
    }
    public float getRadius(){
        return radius;
    }
    public static int getCount(){
        return count;
    }
    public void pop(){
        popped = true;
        count++;
        scoreHandler.sendEmptyMessage(0);
    }
    public static int getMisses(){
        return misses;
    }
    public void tick(){
        clear(); // maybe take this out if popped and put in 2nd if block below
        if(x < -radius*2 || x > imgWidth + radius*2
                || y < -radius*2 || y > imgHeight+radius*2){
            rockCase.remove(this);
        }
        for(int i = 0; i < ypoints.length; i++){
            ypoints[i] += dy;
        }
        for(int i = 0; i < xpoints.length; i++){
            xpoints[i] += dx;
        }
        if(!popped) {
            drawMe();
        }
    }
    public boolean getPopped(){
        return popped;
    }
    public boolean contains(Bullet b){
        /*if(Math.sqrt(Math.pow(b.getX() - x, 2) + Math.pow(b.getY() - y, 2)) <  radius + b.getRadius()){
            return true;
        }
        else{
            return false;
        }*/
        return polygon.contains(b);
    }
    /*public void tick(){ // old tick method without rock checker service

        clear();
        if(y + stickLength + radius< 0){
            rockCase.remove(this);
        }
        y += dy;
        x += dx;
        if(!popped) {
            for(Bullet b : bulletCase.getList()){
                if(b.getHit()){
                    continue;
                }
                if(Math.sqrt(Math.pow(b.getX() - x, 2) + Math.pow(b.getY() - y, 2)) <  radius + b.getRadius()){
                    popped = true;
                    b.hit();
                    count++;
                    scoreHandler.sendEmptyMessage(0);
                }
            }
            drawMe();
        }
    }*/
    public synchronized void clear(){
        //canvas.drawCircle(x, y, radius, paint);
        polygon.clear();
    }
    public synchronized void drawMe(){
        polygon.draw();
        if(!popped && !accessor) {
            /*canvas.drawCircle(x, y, radius, colorPaint);
            canvas.drawLine(x, y + radius, x, y + radius + stickLength, blackPaint);*/
        }
    }
}

